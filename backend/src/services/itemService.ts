import type { Connection } from "oracledb";
import { type InventoryItem, type InventoryItemRow, type Product, type ProductRow, type Warehouse, type WarehouseRow } from "../model.js";
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
     * Retrieves all inventory items for a specific warehouse.
     * @param warehouseId 
     * @returns 
     */
    public async getItemsByWarehouseId(warehouseId: number): Promise<InventoryItem[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: InventoryItemRow[] = (await connection.execute<InventoryItemRow>("SELECT wi.*, p.*, pc.name AS PRODUCT_CATEGORY FROM warehouse_items wi JOIN products p ON wi.product_id = p.id JOIN product_categories pc ON p.product_category_id = pc.id WHERE wi.warehouse_id = :warehouseId", {
                warehouseId: warehouseId
            })).rows ?? [];
        
            await connection.close();

            return result.map<InventoryItem>(ir => ({
                id: ir.ID,
                name: ir.NAME,
                imgUrl: ir.IMG_URL,
                product_category: ir.PRODUCT_CATEGORY,
                unit: ir.UNIT,
                quantity: ir.QUANTITY,
                companyId: ir.COMPANY_ID
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve InventoryItems: ${err}`);
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

    public async createNewProduct(name: string, imgUrl: string, productCategoryId: number, unit: string): Promise<[number, string]> {
        try {
            const connection: Connection = await getDBConnection();

            const result: Result<{ id: number[] }> = (await connection.execute<{ id: number[] }>('INSERT INTO products (name, img_url, product_category_id, unit) VALUES (:name, :imgUrl, :productCategoryId, :unit) RETURNING id INTO :id', {
                name: name,
                imgUrl: imgUrl,
                productCategoryId: productCategoryId,
                unit: unit,
                id: { dir: BIND_OUT, type: NUMBER }
            }));
        
            await connection.commit();
            await connection.close();

            if(!result.outBinds) throw new Error("SQL Outbinds are empty!");

            // fix any potential type issues with the outBinds
            const productId: number | undefined = typeof result.outBinds.id[0] === 'number' ? result.outBinds.id[0] : -1;
            console.log(productId);

            if(productId <= 0) {
                console.error(`Something happened while trying to create a new product. Invalid product id returned: ${productId}`);
                return [-1, "An error occurred while trying to create a new product."];
            }
            
            return [productId, "Product created successfully"];
        } catch(err) {
            console.error(`Something happened while trying to create w new product: ${err}`);
            return [-1, `An error occurred while trying to create a new product: ${err}`];
        }
    }
}