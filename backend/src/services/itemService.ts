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
    /**
     * Retrieves all warehouses for a specific company.
     * @param companyId 
     * @returns 
     */
    public async getWarehousesByCompanyId(companyId: number): Promise<Warehouse[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: WarehouseRow[] = (await connection.execute<WarehouseRow>("SELECT w.*, l.city_name AS CITY, l.latitude, l.longitude, c.name AS COUNTRY FROM warehouses w JOIN locations l ON w.location_id = l.id JOIN countries c ON l.country_code = c.country_code WHERE w.company_id = :companyId", {
                companyId: companyId
            })).rows ?? [];

            await connection.close();

            return result.map<Warehouse>(wr => ({
                id: wr.ID,
                companyId: wr.COMPANY_ID,
                name: wr.NAME,
                latitude: wr.LATITUDE,
                longitude: wr.LONGITUDE,
                city: wr.CITY,
                country: wr.COUNTRY,
                capacity: wr.CAPACITY_M3
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve Warehouses for company id: ${companyId}: ${err}`);
            return null;
        }
    }
}