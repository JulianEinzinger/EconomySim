import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb
import { getDBConnection } from "../data.js";
import { UserService } from "./userService.js";
import type { Company, CompanyRow } from "../model.js";

export class CompanyService {
    public async calculateNextPrice(companyCount: number): Promise<number> {
        if(companyCount == 1) return 0; // First company is free

        const basePrice = 10000; // Base price for the second company
        const growthFactor = 1.85; // Growth factor for subsequent companies

        return basePrice * Math.pow(growthFactor, companyCount - 2);
    }

    /**
     * Tries to found a new company for the user with the given parameters. Checks if the user has enough balance to found a new company, and if so, creates the company.
     * @param userId 
     * @param name 
     * @param businessTypeId 
     * @param countryCode 
     * @param cityName 
     * @param primaryColor 
     * @param secondaryColor 
     * @returns the company-id of the new company, or -1 if failed, and a message describing the result
     */
    public async foundNewCompany(userId: number, name: string, businessTypeId: number, 
        countryCode: string, cityName: string, primaryColor: string, secondaryColor: string): Promise<[number, string]> {
            const userService: UserService = new UserService();

            const balance: number = await userService.getUserBalance(userId);
            const nextPrice: number = await userService.getUserCompanyNextPrice(userId);

            if(balance < nextPrice) return [-1, "Balance not sufficient!"];

            const [companyId, msg]: [number, string] = await this.createNewCompany(userId, name, businessTypeId, countryCode, cityName, primaryColor, secondaryColor);
            return [companyId, msg];
        }

    /**
     * @returns company-id of the new company, or -1 if failed
     */
    private async createNewCompany(userId: number, name: string, businessTypeId: number, 
        countryCode: string, cityName: string, primaryColor: string, secondaryColor: string): Promise<[number, string]> {
            console.log(`Params: ${userId}, ${name}, ${businessTypeId}, ${countryCode}, ${cityName}, ${primaryColor}, ${secondaryColor}`);
            

            try {
                const connection: Connection = await getDBConnection();

                const result: Result<{ id: number[] }> = await connection.execute<{ id: number[] }>(`INSERT INTO companies (name, ownerid, country_code, city_name, business_type_id, 
                    primary_color, secondary_color) VALUES (:name, :ownerid, :countryCode, :cityname, :businessTypeId, :primaryColor, :secondaryColor)
                    RETURNING id INTO :id`, ({
                        name: name,
                        ownerid: userId,
                        countryCode: countryCode,
                        cityName: cityName,
                        businessTypeId: businessTypeId,
                        primaryColor: primaryColor,
                        secondaryColor: secondaryColor,
                        id: { dir: BIND_OUT, type: NUMBER }
                    }));

                if(!result.outBinds) throw new Error("SQL Outbinds are empty!");

                const companyId = result.outBinds.id[0];

                if(!companyId) throw new Error("Failed to retrieve company ID from database!");

                await connection.commit();
                await connection.close();

                return [companyId, `Successfully founded company ${name}!`];
            } catch(err) {
                console.error(`Something happened while trying to create a new company: ${err}`);
                return [-1, `Failed to create company: ${err}`];
            }
    }

    /**
     * Checks if a company is owned by a specific user.
     * @param companyId the id of the company to check ownership for
     * @param userId the id of the user to check ownership for
     * @returns true if the company is owned by the user, false otherwise
     */
    public async isCompanyOwnedByUser(companyId: number, userId: number): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const rows: { COUNT: number }[] = (await connection.execute<{ COUNT: number }>(`SELECT COUNT(*) AS COUNT FROM companies WHERE id = :companyId AND ownerid = :userId`, {
                companyId: companyId,
                userId: userId
            })).rows ?? [];


            await connection.close();
            if(rows && rows.length > 0) {
                const count: number = rows[0]?.COUNT ?? 0;
                
                return count > 0;
            }
            return false;
        } catch(err) {
            console.error(`Error checking company ownership: ${err}`);
            return false;
        }
    }

    /**
     * Returns a company if it exists and is owned by the specified user.
     * @param companyId 
     * @param userId 
     * @returns ret
     */
    public async getCompanyByIdForUser(companyId: number, userId: number): Promise<Company | "forbidden" | null> {
        try {
            // First check if the company is owned by the user
            const isOwned: boolean = await this.isCompanyOwnedByUser(companyId, userId);

            if(!isOwned) return "forbidden";

            const connection: Connection = await getDBConnection();

            const rows: CompanyRow[] = (await connection.execute<CompanyRow>("SELECT * FROM companies WHERE id = :companyId", {
                companyId: companyId
            })).rows ?? [];

            await connection.close();

            if(rows.length === 0 || !rows[0]) return null;

            const row: CompanyRow = rows[0];

            return ({
                id: row.ID,
                name: row.NAME,
                ownerId: row.OWNER_ID,
                businessTypeId: row.BUSINESS_TYPE_ID
            });
        } catch(err) {
            console.error(`Error fetching company by ID for user: ${err}`);
            return null;
        }
    }

    /**
     * Returns the company ID for a given warehouse ID, or null if the warehouse does not exist or an error occurs.
     * @param warehouseId 
     * @returns 
     */
    public async getCompanyIdForWarehouseId(warehouseId: number): Promise<number | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: { COMPANY_ID: number}[] = (await connection.execute<{ COMPANY_ID: number }>(`SELECT COMPANY_ID FROM warehouses WHERE ID = :warehouseId`, {
                warehouseId: warehouseId
            })).rows ?? [];

            await connection.close();

            if(result.length === 0 || !result[0]) return null;

            return result[0].COMPANY_ID;
        } catch(err) {
            console.error(`Error fetching company ID for warehouse ID: ${err}`);
            return null;
        }
    }
}