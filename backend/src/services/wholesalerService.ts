import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { DeliveryStatus, PaymentStatus, type Wholesaler, type WholesalerOrder, type WholesalerOrderItem, type WholesalerOrderItemRow, type WholesalerOrderRow, type WholesalerProduct, type WholesalerRow } from "@economysim/shared";
import { getDBConnection } from "../data.js";

export class WholesalerSevice {

    /**
     * 
     * @returns all wholesalers
     */
    async getAllWholesalers(): Promise<Wholesaler[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: WholesalerRow[] = (await connection.execute<WholesalerRow>(`SELECT w.id AS W_ID, w.name AS W_NAME, l.latitude, 
                w.logo_url AS W_LOGO_URL, l.longitude, l.city_name, c.name as country_name, wp.PRODUCT_ID, wp.price, wp.STOCK_QUANTITY,
                wp.ORDER_UNIT, wp.MAX_ORDER_STACKS, p.NAME AS p_name, p.IMG_URL, p.UNIT AS p_unit, pc.NAME AS p_category, pc.img_url as category_img_url
FROM es_wholesalers w
    JOIN es_locations l ON w.location_id = l.id
    JOIN es_countries c ON l.country_code = c.country_code
    JOIN es_wholesaler_products wp ON w.id = wp.WHOLESALER_ID
    JOIN es_products p ON wp.PRODUCT_ID = p.ID
    JOIN es_product_categories pc ON p.PRODUCT_CATEGORY_ID = pc.ID`)).rows ?? [];

            await connection.close();

            const wholesalers: Map<number, Wholesaler> = new Map();

            result.forEach(wr => {
                if(!wholesalers.has(wr.W_ID)) {
                    wholesalers.set(wr.W_ID, ({
                        id: wr.W_ID,
                        name: wr.W_NAME,
                        logoUrl: wr.W_LOGO_URL,
                        location: {
                            latitude: wr.LATITUDE,
                            longitude: wr.LONGITUDE,
                            cityName: wr.CITY_NAME,
                            countryName: wr.COUNTRY_NAME
                        },
                        products: []
                    }));
                }

                const newProduct: WholesalerProduct = {
                    id: wr.PRODUCT_ID,
                    name: wr.P_NAME,
                    product_category: wr.P_CATEGORY,
                    unit: wr.P_UNIT,
                    imgUrl: wr.IMG_URL,
                    price: wr.PRICE,
                    stock_quantity: wr.STOCK_QUANTITY,
                    max_order_stacks: wr.MAX_ORDER_STACKS,
                    order_unit: wr.ORDER_UNIT,
                    category_img_url: wr.CATEGORY_IMG_URL
                };

                wholesalers.get(wr.W_ID)?.products.push(newProduct);
            });

            return Array.from(wholesalers.values());
        } catch (err) {
            console.error(`Something happened while trying to retrieve wholesalers from db: ${err}`);
            return null;
        }
    }

    /**
     * Creates a new order for the specified company and wholesaler with the given items. Returns an object indicating success and the created order ID (or -1 if failed).
     * @param companyId 
     * @param wholesalerId 
     * @param items 
     * @returns an object containing a success flag and the created order ID (or -1 if failed)
     * @throws an error if validation of items fails or if there is an issue with the database operations
     */
    async createOrder(companyId: number, wholesalerId: number, items: WholesalerOrderItem[]): Promise<{success: boolean, orderId: number}> {
        try {
            const connection: Connection = await getDBConnection();

            // TODO - validate items (check if wholesaler actually sells the products, check if stock is sufficient, etc.)
            for(const i of items) {
                console.log(`Checking, if there are ${i.quantity}x ${i.product_id}...`);
                const itemValidationResult = await this.checkAvailability(wholesalerId, i.product_id, i.quantity);

                if(!itemValidationResult) {
                    throw new Error(`Validation failed for product ID ${i.product_id}: either the wholesaler(id: ${wholesalerId}) doesn't sell this product or there isn't enough stock!`);
                }
            }

            // All  items are valid and available

            const orderDate: Date = new Date(); // current date
            const deliveryDate: Date = await this.calculateDeliveryDate(wholesalerId, companyId);
            const totalPrice: number = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);

            const result: Result<{ id: number[] }> = await connection.execute(`INSERT INTO es_wholesaler_orders (company_id, wholesaler_id, order_date, delivery_date, 
                total_price, payment_status, delivery_status) VALUES (:company_id, :wholesaler_id, :order_date, :delivery_date, :total_price, :payment_status, :delivery_status) RETURNING id INTO :id`, {
                    company_id: companyId,
                    wholesaler_id: wholesalerId,
                    order_date: orderDate,
                    delivery_date: deliveryDate,
                    total_price: totalPrice,
                    payment_status: PaymentStatus.PENDING,
                    delivery_status: DeliveryStatus.IN_TRANSIT,
                    id: { dir: BIND_OUT, type: NUMBER }
                });

            if(!result.outBinds) throw new Error('SQL Outbinds are empty!');

            const orderId = result.outBinds.id[0];
            if(!orderId) throw new Error("Failed to retrieve order ID from database!");
            
            const itemsRes = await connection.executeMany(`INSERT INTO es_wholesaler_order_items (order_id, product_id, 
                quantity, price_per_unit, subtotal) VALUES (:order_id, :product_id, :quantity, :price_per_unit, :subtotal)`,
                items.map(i => ({
                    order_id: orderId,
                    product_id: i.product_id,
                    quantity: i.quantity,
                    price_per_unit: i.pricePerUnit,
                    subtotal: i.quantity * i.pricePerUnit
                }))
            );
            console.log(`Inserted ${itemsRes.rowsAffected} order items for order ID ${orderId}`);
            

            await connection.commit();
            await connection.close();
            
            return {
                success: true,
                orderId: orderId
            };
        } catch(err) {
            console.error(`Something happened while trying to make a purchase: ${err}`);
            return {
                success: false,
                orderId: -1
            };
        }
    }

    /**
     * Checks if the specified wholesaler has enough stock of the given product 
     * @param wholesalerId 
     * @param productId 
     * @param quantity 
     * @returns true if the wholesaler has enough stock, false otherwise
     */
    async checkAvailability(wholesalerId: number, productId: number, quantity: number): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const result = await connection.execute(`SELECT 1 FROM es_wholesaler_products WHERE wholesaler_id = :wholesaler_id AND product_id = :product_id AND
                stock_quantity >= :quantity`, {
                    wholesaler_id: wholesalerId,
                    product_id: productId,
                    quantity: quantity
                }
            );

            await connection.close();

            return (result.rows?.length ?? 0) > 0;

        } catch(err) {
            console.error(`Something happened while trying to check availability of product ID ${productId} at wholesaler ID ${wholesalerId}: ${err}`);
            return false;
        }
    }

    /**
     * Gets all orders for a specific company
     * @param companyId 
     * @returns 
     */
    async getOrdersByCompanyId(companyId: number): Promise<WholesalerOrder[]> {
        try {
            const connection: Connection = await getDBConnection();

            const orderResult: WholesalerOrderRow[] = (await connection.execute<WholesalerOrderRow>(`SELECT * FROM es_wholesaler_orders WHERE company_id = :company_id`, {
                company_id: companyId
            })).rows ?? [];

            await connection.close();

            return orderResult.map<WholesalerOrder>(or => ({
                id: or.ID,
                companyId: or.COMPANY_ID,
                wholesalerId: or.WHOLESALER_ID,
                orderDate: or.ORDER_DATE,
                deliveryDate: or.DELIVERY_DATE,
                totalPrice: or.TOTAL_PRICE,
                paymentStatus: or.PAYMENT_STATUS,
                deliveryStatus: or.DELIVERY_STATUS
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve orders from company id:${companyId} from database: ${err}`);
            return [];
        }
    }

    /**
     * Returns an order if it exists and is for the specified company.
     * @param orderId 
     * @param companyId 
     * @returns an order if successful, null if an error occurs, forbidden if the order is not for the specified company
     */
    async getOrderById(orderId: number, companyId: number): Promise<WholesalerOrder | 'forbidden' | null> {
        try {
            const connection: Connection = await getDBConnection();

            const orderResult: Result<WholesalerOrderRow> = await connection.execute<WholesalerOrderRow>(`SELECT * FROM es_wholesaler_orders WHERE id = :order_id LIMIT 1`, {
                order_id: orderId
            });

            await connection.close();

            if(!orderResult.rows || orderResult.rows.length === 0) {
                throw new Error(`No order found with this id!`);
            }

            const row: WholesalerOrderRow = orderResult.rows[0]!;

            if(row.COMPANY_ID != companyId) {
                return "forbidden";
            }

            return ({
                id: row.ID,
                companyId: row.COMPANY_ID,
                wholesalerId: row.WHOLESALER_ID,
                orderDate: row.ORDER_DATE,
                deliveryDate: row.DELIVERY_DATE,
                totalPrice: row.TOTAL_PRICE,
                paymentStatus: row.PAYMENT_STATUS,
                deliveryStatus: row.DELIVERY_STATUS
            });
        } catch (err) {
            console.error(`Something happened while trying to retrieve order with id ${orderId} from database: ${err}`);
            return null;
        }
    }

    /**
     * Determines if a specific order is for the given company
     * @param orderId 
     * @param companyId 
     * @returns true if successful, false if not, null if the order does not exist
     */
    async isOrderForCompany(orderId: number, companyId: number): Promise<boolean | null> {
        try {
            const connection: Connection = await getDBConnection();

            const orderResult: Result<WholesalerOrderRow> = await connection.execute<WholesalerOrderRow>(`SELECT * FROM es_wholesaler_orders WHERE id = :order_id LIMIT 1`, {
                order_id: orderId
            });
            await connection.close();

            if(!orderResult.rows || orderResult.rows.length === 0) {
                return null;
            }

            const row: WholesalerOrderRow = orderResult.rows[0]!;

            if(row.COMPANY_ID != companyId) {
                return false;
            }

            return true;
        } catch (err) {
            console.error(`Something happened while trying to determine owner of order with id ${orderId}: ${err}`);
            return false;
        }
    }

    /**
     * Retrieves all items included in a specific order and checks if the given company has access to it
     * @param orderId 
     * @param companyId 
     * @returns the order items, forbidden if the company doesn't have access to the order, or null if an error occurs
     */
    async getOrderItems(orderId: number, companyId: number): Promise<WholesalerOrderItem[] | 'forbidden' | null> {
        try {
            // order validation
            const validationResult = await this.isOrderForCompany(orderId, companyId);

            if(validationResult === false) {
                return 'forbidden';
            }
            if(validationResult === null) {
                return null;
            }

            const connection: Connection = await getDBConnection();

            const result: WholesalerOrderItemRow[] = (await connection.execute<WholesalerOrderItemRow>(`SELECT * FROM es_wholesaler_order_items WHERE order_id = :order_id`)).rows ?? [];
            
            await connection.close();

            return result.map<WholesalerOrderItem>(or => ({
                id: or.ID,
                order_id: or.ORDER_ID,
                product_id: or.PRODUCT_ID,
                quantity: or.QUANTITY,
                pricePerUnit: or.PRICE_PER_UNIT,
                subtotal: or.SUBTOTAL
            }))
        } catch (err) {
            console.error(`Something happened while trying to retrieve order items for order with id ${orderId}: ${err}`);
            return null;
        }
    }

    /**
     * Updates the payment status of an order
     * @param orderId 
     * @param status 
     * @returns true if successful, false otherwise
     */
    async updatePaymentStatus(orderId: number, status: PaymentStatus): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const result = await connection.execute(`UPDATE es_wholesaler_orders SET payment_status = :status WHERE id = :order_id`, {
                order_id: orderId,
                status: status
            });

            await connection.close();
            
            return (result.rows?.length ?? 0) > 0;
        } catch (err) {
            console.error(`Something happened while trying to update payment status for order with id ${orderId}: ${err}`);
            return false;
        }
    }

    /**
     * Updates the delivery status of an order
     * @param orderId 
     * @param status 
     * @returns true if successful, false otherwise
     */
    async updateDeliveryStatus(orderId: number, status: DeliveryStatus): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const result = await connection.execute(`UPDATE es_wholesaler_orders SET delivery_status = :status WHERE id = :order_id`, {
                order_id: orderId,
                status: status
            });

            await connection.close();
            
            return (result.rows?.length ?? 0) > 0;
        } catch (err) {
            console.error(`Something happened while trying to update delivery status for order with id ${orderId}: ${err}`);
            return false;
        }
    }

    /**
     * Calculates the estimated delivery date for an order based on the distance between the wholesaler and the company, assuming a delivery speed of 65 km/h and adding 30 minutes for handling time. If there is an error during the process, it returns a fallback delivery date of 7 days from now.
     * @param wholesalerId 
     * @param companyId 
     * @returns the estimated delivery date for the order, or a fallback date of 7 days from now if an error occurs
     */
    async calculateDeliveryDate(wholesalerId: number, companyId: number): Promise<Date> {
        try {
            // get coordinates of wholesaler and company from db
            const connection: Connection = await getDBConnection();

            const wholesalerResult = await connection.execute<{ LATITUDE: number, LONGITUDE: number }>(`SELECT l.latitude, l.longitude FROM es_wholesalers w JOIN es_locations l ON w.location_id = l.id WHERE w.id = :wholesaler_id`, {
                wholesaler_id: wholesalerId
            });

            const wholesalerLocation = wholesalerResult.rows ? wholesalerResult.rows[0] : null;

            const companyResult = await connection.execute<{ LATITUDE: number, LONGITUDE: number }>(`SELECT l.latitude, l.longitude FROM es_companies c JOIN es_locations l ON c.location_id = l.id WHERE c.id = :company_id`, {
                company_id: companyId
            });

            const companyLocation = companyResult.rows ? companyResult.rows[0] : null;

            await connection.close();

            if(!wholesalerLocation || !companyLocation) {
                throw new Error(`Failed to retrieve locations for wholesaler ID ${wholesalerId} and company ID ${companyId}`);
            }

            const distance: number = this.calculateDistance({lat: wholesalerLocation.LATITUDE, long: wholesalerLocation.LONGITUDE}, 
                                                            {lat: companyLocation.LATITUDE, long: companyLocation.LONGITUDE});
            
            // assume delivery speed of 65 km/h and add 30mins for handling
            const deliverySpeed = 65; // km/h
            const handlingTimeInHours = 0.5; // 30 minutes

            const deliveryTimeInHours = distance / deliverySpeed + handlingTimeInHours;
            const deliveryTimeInMs = deliveryTimeInHours * 60 * 60 * 1000;
            const deliveryDate = new Date(Date.now() + deliveryTimeInMs);
            
            return deliveryDate;
        } catch (err) {
            console.error(`Something happened while trying to calculate delivery date for wholesaler with id ${wholesalerId}: ${err}`);
            return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // fallback: 7 days from now
        }
    }

    /**
     * Calculates the haversine distance between two coordinates
     * @param coord1 
     * @param coord2 
     * @returns 
     */
    calculateDistance(coord1: { lat: number, long: number }, coord2: { lat: number, long: number }): number {
        const R = 6371; // Earth radius in kilometers

        const lat1 = this.toRadians(coord1.lat);
        const lat2 = this.toRadians(coord2.lat);
        const deltaLat = this.toRadians(coord2.lat - coord1.lat);
        const deltaLong = this.toRadians(coord2.long - coord1.long);

        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLong / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }
}