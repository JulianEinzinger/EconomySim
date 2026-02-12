import oracledb, { type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { getDBConnection } from "../data.js";
import type { User, UserRow } from "../model.js";
import * as bcrypt from "bcrypt";

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

}