import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { type InventoryItem, type InventoryItemRow, type Product, type ProductRow, type Warehouse, type WarehouseRow, type WarehouseWithItemsRow } from "../model.js";
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

            const result: InventoryItemRow[] = (await connection.execute<InventoryItemRow>("SELECT wi.*, p.*, pc.name AS PRODUCT_CATEGORY FROM warehouse_items wi JOIN products p ON wi.product_id = p.id JOIN product_categories pc ON p.product_category_id = pc.id WHERE wi.warehouse_id = :warehouseId ORDER BY p.name", {
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
        const connection = await getDBConnection();

        const rows = (await connection.execute<WarehouseWithItemsRow>(
            `SELECT
    w.id              AS W_ID,
    w.company_id      AS W_COMPANY_ID,
    w.name            AS W_NAME,
    w.capacity_m3     AS W_CAPACITY,

    l.city_name       AS CITY,
    l.latitude        AS LATITUDE,
    l.longitude       AS LONGITUDE,
    c.name            AS COUNTRY,

    wi.product_id             AS WI_ID,
    wi.quantity       AS QUANTITY,

    p.id              AS P_ID,
    p.name            AS P_NAME,
    p.img_url         AS IMG_URL,
    p.unit            AS UNIT,
    pc.name           AS PRODUCT_CATEGORY

FROM warehouses w
JOIN locations l ON w.location_id = l.id
JOIN countries c ON l.country_code = c.country_code

LEFT JOIN warehouse_items wi ON wi.warehouse_id = w.id
LEFT JOIN products p ON wi.product_id = p.id
LEFT JOIN product_categories pc ON p.product_category_id = pc.id

WHERE w.company_id = :companyId
ORDER BY w.id, p.name`,
            { companyId }
        )).rows ?? [];

        await connection.close();

        const warehouseMap = new Map<number, Warehouse>();

        for (const r of rows) {
            // 🏭 Warehouse noch nicht vorhanden → anlegen
            if (!warehouseMap.has(r.W_ID)) {
                warehouseMap.set(r.W_ID, {
                    id: r.W_ID,
                    companyId: r.W_COMPANY_ID,
                    name: r.W_NAME,
                    latitude: r.LATITUDE,
                    longitude: r.LONGITUDE,
                    city: r.CITY,
                    country: r.COUNTRY,
                    capacity: r.W_CAPACITY,
                    items: []
                });
            }

            // 📦 Item vorhanden?
            if (r.WI_ID && r.P_ID) {
                warehouseMap.get(r.W_ID)!.items.push({
                    id: r.WI_ID,
                    name: r.P_NAME!,
                    imgUrl: r.IMG_URL!,
                    product_category: r.PRODUCT_CATEGORY!,
                    unit: r.UNIT!,
                    quantity: r.QUANTITY!,
                    companyId: r.W_COMPANY_ID
                });
            }
        }

        return [...warehouseMap.values()];
    } catch (err) {
        console.error(err);
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