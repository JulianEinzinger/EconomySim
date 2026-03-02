import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import type { City, CityRow, Country, CountryRow, Location, LocationRow } from "../model.js";

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
                countryCode: cr.COUNTRY_CODE,
                latitude: cr.LATITUDE,
                longitude: cr.LONGITUDE
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve cities from database: ${err}`);
            return null;
        }
    }

    /**
     * Retrieves all free locations from the database.
     * @returns a list of locations, or null if an error occurs.
     */
    public async getFreeLocations(): Promise<Location[] | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: LocationRow[] = (await connection.execute<LocationRow>("SELECT l.id, l.name, l.latitude, l.longitude, l.city_name, l.country_code FROM companies c RIGHT JOIN locations l on c.location_id = l.id WHERE c.name IS NULL")).rows ?? [];

            await connection.close();

            return result.map<Location>(lr => ({
                id: lr.ID,
                name: lr.NAME,
                latitude: lr.LATITUDE,
                longitude: lr.LONGITUDE,
                cityName: lr.CITY_NAME,
                countryCode: lr.COUNTRY_CODE
            }));
        } catch(err) {
            console.error(`Something happened while trying to retrieve free locations from database: ${err}`);
            return null;
        }
    }
}