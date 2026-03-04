import type { Connection } from "oracledb";
import type { Wholesaler, WholesalerProduct, WholesalerRow } from "@economysim/shared";
import { getDBConnection } from "../data.js";

export class WholesalerSevice {

    /**
     * 
     * @returns all wholesalers
     */
    async getAllWholesalers(): Promise<Wholesaler[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: WholesalerRow[] = (await connection.execute<WholesalerRow>(`SELECT w.id AS W_ID, w.name AS W_NAME, l.latitude, l.longitude, 
                l.city_name, c.name as country_name, wp.PRODUCT_ID, wp.price, wp.STOCK_QUANTITY,
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
}