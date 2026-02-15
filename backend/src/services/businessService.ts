import type { Connection } from "oracledb";
import type { BusinessType, BusinessTypeRow } from "../model.js";
import { getDBConnection } from "../data.js";

export class BusinessService {
    /**
     * Retrieves all business types from the database.
     * @returns a list of business types, or null if an error occurs.
     */
    public async getAllBusinessTypes(): Promise<BusinessType[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: BusinessTypeRow[] = (await connection.execute<BusinessTypeRow>("SELECT * FROM business_types ORDER BY id DESC")).rows ?? [];

            return result.map<BusinessType>(row => ({
                id: row.ID,
                name: row.NAME
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve business types from db: ${err}`);
            return null;
        }
    }
}