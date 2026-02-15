import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import type { City, CityRow, Country, CountryRow } from "../model.js";

export class LocationService {

    /**
     * Retrieves all countries from the database.
     * @returns a list of countries, or null if an error occurs.
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

    /**
     * Retrieves all cities from the database.
     * @returns a list of cities, or null if an error occurs.
     */
    public async getAllCities(): Promise<City[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: CityRow[] = (await connection.execute<CityRow>("SELECT * FROM cities")).rows ?? [];

            await connection.close();

            return result.map<City>(cr => ({
                name: cr.NAME,
                countryCode: cr.COUNTRY_CODE
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve cities from database: ${err}`);
            return null;
        }
    }
}