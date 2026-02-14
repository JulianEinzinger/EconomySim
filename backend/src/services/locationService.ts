import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import type { Country, CountryRow } from "../model.js";

export class LocationService {

    /**
     * Retrieves all countries from the database.
     * @returns a list of countries, or an empty list if an error occurs.
     */
    public async getAllCountries(): Promise<Country[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: CountryRow[] = (await connection.execute<CountryRow>("SELECT * FROM countries")).rows ?? [];

            await connection.close();

            return result.map<Country>(cr => ({
                countryCode: cr.COUNTRY_CODE,
                name: cr.NAME
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve countries from database: ${err}`)
            return null;
        }
    }
}