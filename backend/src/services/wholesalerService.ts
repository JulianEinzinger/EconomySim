import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { DeliveryStatus, PaymentStatus, type Wholesaler, type WholesalerOrderItem, type WholesalerProduct, type WholesalerRow } from "@economysim/shared";
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
FROM wholesalers w
    JOIN locations l ON w.location_id = l.id
    JOIN countries c ON l.country_code = c.country_code
    JOIN wholesaler_products wp ON w.id = wp.WHOLESALER_ID
    JOIN products p ON wp.PRODUCT_ID = p.ID
    JOIN product_categories pc ON p.PRODUCT_CATEGORY_ID = pc.ID`)).rows ?? [];

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

    async createOrder(companyId: number, wholesalerId: number, items: WholesalerOrderItem[]): Promise<{success: boolean, orderId: number}> {
        try {
            const connection: Connection = await getDBConnection();

            const orderDate: Date = new Date(); // current date
            const deliveryDate: Date = this.calculateDeliveryDate(wholesalerId, companyId);
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
            
            // TODO - insert order items into es_wholesaler_order_items

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

    calculateDeliveryDate(wholesalerId: number, companyId: number): Date {
        return new Date(Date.parse('17 July 2026')); // TODO - implement actual delivery date calculation based on haversine distance and other factors
    }
}