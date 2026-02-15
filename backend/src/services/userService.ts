import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { getDBConnection } from "../data.js";
import type { Company, CompanyRow, User, UserRow } from "../model.js";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { TokenPayload } from "./authService.js";
import { CompanyService } from "./companyService.js";

export class UserService {

    /**
     * 
     * @returns all users
     */
    async getAllUsers(): Promise<User[]> {
        let users: User[] = [];

        try {
            let connection = await getDBConnection();

            const rows: UserRow[] = (await connection.execute<UserRow>(`SELECT * FROM users`)).rows ?? [];
            console.log(rows);
            
            users = rows.map<User>(e => ({
                id: e.ID,
                username: e.USERNAME,
                passwordHash: e.PASSWORD_HASH
            }));

            await connection.close();
        } catch(e) {
            console.error(`Something happened while retrieving users from database: ${e}`);
            
            return users;
        }

        return users;
    }

    /**
     * 
     * @param username username for the new user
     * @param password unhashed (raw) password for the new user
     * @returns user-id of the new user, or -1 if failed
     */
    async createNewUser(username: string, password: string): Promise<number> {
        try {
            let connection = await getDBConnection();

            const saltRounds = 10;
            const passwordHash: string = await bcrypt.hash(password, saltRounds);

            const result: Result<{ id: number[] }> = await connection.execute(`INSERT INTO users (username, password_hash) VALUES (:username, :passwordHash) RETURNING id INTO :id`, {
                username: username,
                passwordHash: passwordHash,
                id: { dir: BIND_OUT, type: NUMBER }
            });

            if(!result.outBinds) throw new Error("SQL Outbinds are empty!");

            const userId = result.outBinds.id[0];
            if(userId === undefined) throw new Error("Failed to retrieve user ID from database!");
            
            await connection.commit();
            await connection.close();

            return userId;
        } catch(e) {
            console.error(`Something happened whilst trying to create a new user: ${e}`);

            return -1;
        }
    }

    /**
     * 
     * @param username username to check for
     * @param password password to check for
     * @returns a boolean value indicating whether the provided credentials are valid or not
     */
    async checkUserCredentials(username: string, password: string): Promise<[boolean, number]> {
        try {
            let connection = await getDBConnection();

            const result: Result<UserRow> = await connection.execute(`SELECT * FROM users WHERE username = :username`, {
                username: username
            });
            const user = result.rows?.[0];

            await connection.close();
            if(!user) return [false, -1];

            const passwordHash: string = user.PASSWORD_HASH;

            return [await bcrypt.compare(password, passwordHash), user.ID];

        } catch(e) {
            console.error(`Something happened whilst trying to check user credentials: ${e}`);

            return [false, -1];
        }
    }

    /**
     * creates a JWT token for the provided username
     * @param username username to create the token for
     * @returns jwt token as a string
     */
    createToken(username: string, userId: number): string {
        // create token with JWT
        const SECRET_KEY = "mySecretKey";
        const payload: TokenPayload = { username, userId };
        return jwt.sign(payload, SECRET_KEY, { expiresIn: "10m" });
    }

    /**
     * retrieves all companies owned by the user with the provided user ID
     * @param userId the ID of the user to retrieve the companies for
     * @returns a list of companies owned by the user, or an empty list if an error occurred
     */
    async getUserCompanies(userId: number): Promise<Company[]> {
        try {
            let connection = await getDBConnection();

            const result: CompanyRow[] = (await connection.execute<CompanyRow>("SELECT * FROM companies WHERE ownerId = :userId", {
                userId: userId
            })).rows ?? [];

            await connection.close();

            return result.map<Company>((e: CompanyRow) => ({
                id: e.ID,
                name: e.NAME,
                ownerId: e.OWNER_ID
            }));
        } catch(e) {
            console.error(`Something happened while retrieving user companies from database: ${e}`);

            return [];
        }
    }

    /**
     * calculates the price for the next company the user would buy, based on how many companies they already own.
     * @param userId the ID of the user to calculate the next company price for
     * @returns the price for the next company the user would buy, based on how many companies they already own.
     */
    async getUserCompanyNextPrice(userId: number): Promise<number> {
        const companies: Company[] = await this.getUserCompanies(userId);
        const companyCount = companies.length;

        const companyService = new CompanyService();
        return companyService.calculateNextPrice(companyCount+1);
    }

    /**
     * retrieves the balance of the user with the provided user ID
     * @param userId the ID of the user to retrieve the balance for
     * @returns the balance of the user, or 0 if an error occurred
     */
    async getUserBalance(userId: number): Promise<number> { 
        try {
            const connection: Connection = await getDBConnection();

            const result: Result<{ balance: number }> = (await connection.execute<{ balance: number }>("SELECT u.balance FROM users u WHERE u.id = :userId", {
                userId: userId
             }));

            if(!result.rows || result.rows.length === 0) throw new Error("No user found with the provided ID!");

            const balance: number = result.rows[0]?.balance ?? 0;
            
            await connection.close();

            return balance;
        } catch(err) {
            console.error(`Something happened while trying to retrieve user balance from db: ${err}`);
            return 0;
        }
    }
}