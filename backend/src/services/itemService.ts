import type { Connection } from "oracledb";
import type { Product, ProductRow } from "../model.js";
import { getDBConnection } from "../data.js";

export class ItemService {

    /**
     * Retrieves all products from the database.
     * @returns a list of products, or null if an error occurs.
     */
    public async getAllAvailableItems(): Promise<Product[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: ProductRow[] = (await connection.execute<ProductRow>("SELECT p.*, pc.name AS PRODUCT_CATEGORY FROM products p JOIN product_categories pc ON p.product_category_id = pc.id")).rows ?? [];
       
            await connection.close();

            return result.map<Product>(p => ({
                id: p.ID,
                name: p.NAME,
                imgUrl: p.IMG_URL,
                product_category: p.PRODUCT_CATEGORY,
                unit: p.UNIT
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve products from database: ${err}`);
            return null;
        }
    }
}