import type { Connection } from "oracledb";
import { getDBConnection } from "./data.js";
import { AccountType, LoanStatus } from "@economysim/shared";

export class GameConfig {
    /** The base interest rate for the game in percent. */
    private static BASE_INTEREST_RATE = 5;
    /** The base capital for the central bank. */
    public static BASE_CAPITAL = 1000000;

    private static GIRO_RESERVE_RATIO = 0.2;
    private static SAVINGS_RESERVE_RATIO = 0.1;

    public static getBaseRate(): number {
        return this.BASE_INTEREST_RATE;
    }

    public static CENTRAL_BANK_ACCOUNT_IBAN = "CENTRALBANK000000000";

    public static async getAvailableLendingCapacity(): Promise<number> {
        try {
            const connection: Connection = await getDBConnection();

            const depositsResult = await connection.execute<{ TOTAL_DEPOSITS: number }>(`SELECT SUM(balance) AS total_deposits FROM es_bank_accounts`);
            const totalDeposits: number = (depositsResult.rows && depositsResult.rows[0]?.TOTAL_DEPOSITS) ?? 0;

            const reservesResult = await connection.execute<{ TOTAL_RESERVES: number }>(`
                SELECT SUM(
                    CASE
                        WHEN account_type = :giro_type
                            THEN balance * :giro_ratio
                        WHEN account_type = :savings_type
                            THEN balance * :savings_ratio
                        ELSE 0
                    END
                ) AS total_reserves
                FROM es_bank_accounts
            `, {
                giro_ratio: Number(this.GIRO_RESERVE_RATIO),
                giro_type: AccountType.GIRO,
                savings_ratio: Number(this.SAVINGS_RESERVE_RATIO),
                savings_type: AccountType.SAVINGS
            });
            const totalReserves: number = (reservesResult.rows && reservesResult.rows[0]?.TOTAL_RESERVES) ?? 0;

            const outstandingLoansResult = await connection.execute<{ TOTAL_OUTSTANDING_LOANS: number }>(`SELECT SUM(principal) AS total_outstanding_loans FROM es_loans WHERE status = :active_status OR status = :defaulted_status`, {
                active_status: LoanStatus.ACTIVE,
                defaulted_status: LoanStatus.DEFAULTED
            });
            await connection.close();

            const totalOutstandingLoans: number = (outstandingLoansResult.rows && outstandingLoansResult.rows[0]?.TOTAL_OUTSTANDING_LOANS) ?? 0;

            const availableLendingCapacity = this.BASE_CAPITAL + totalDeposits - totalReserves - totalOutstandingLoans;

            return availableLendingCapacity;
        } catch (err) {
            console.error("Something happened while calculating the available lending capacity:", err);
            return 0; // Return a default value in case of error
        }
    }
}