import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import { LedgerEntryType, TransactionStatus, type Transaction, type TransactionRow } from "@economysim/shared";

export class TransactionService {
    //#region Singleton
    private static instance: TransactionService;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): TransactionService {
        if(!TransactionService.instance) {
            TransactionService.instance = new TransactionService();
        }

        return TransactionService.instance;
    }

    //#endregion

    /**
     * Execute a transfer between two accounts, writing both ledger entries atomically. The transaction will be marked as PENDING until it is settled by the settlement service.
     * @param fromIban 
     * @param toIban 
     * @param amount 
     * @param description 
     * @returns a boolean indicating whether the transfer was successful
     */
    async transfer(fromIban: string, toIban: string, amount: number, description: string): Promise<boolean> {
        try {
            // execute a transfer, writing both ledger entries atomically
            const connection: Connection = await getDBConnection();

            const transactionResult = await connection.execute(`INSERT INTO es_transactions (from_iban, to_iban, amount, status) VALUES (:fromIban, :toIban, :amount, :status)`, {
                fromIban,
                toIban,
                amount,
                status: TransactionStatus.PENDING
            });

            // ledger entries
            await connection.execute(`INSERT INTO es_ledger_entries (transaction_id, iban, amount, entry_type, description) VALUES 
            (:transactionId, :iban, :amount, :entryType, :description)`, {
                transactionId: transactionResult.lastRowid,
                iban: fromIban,
                amount: -amount,
                entryType: LedgerEntryType.DEBIT,
                description
            });

            await connection.execute(`INSERT INTO es_ledger_entries (transaction_id, iban, amount, entry_type, description) VALUES 
            (:transactionId, :iban, :amount, :entryType, :description)`, {
                transactionId: transactionResult.lastRowid,
                iban: toIban,
                amount: amount,
                entryType: LedgerEntryType.CREDIT,
                description
            });

            await connection.commit();
            await connection.close();

            return true;
        } catch (err) {
            console.error(`Something happened while transferring money from ${fromIban} to ${toIban}: ${err}`);
            return false;
        }
    }

    /**
     * Retrieve a transaction by its ID, ensuring that it belongs to the specified company.
     * @param transactionId 
     * @param companyId 
     * @returns a Transaction object if found and belongs to the company, otherwise null
     */
    async getTransactionById(transactionId: number, companyId: number): Promise<Transaction | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: TransactionRow[] = (await connection.execute<TransactionRow>(`SELECT * FROM es_transactions WHERE id = :transactionId AND company_id = :companyId`, {
                transactionId,
                companyId
            })).rows ?? [];

            await connection.close();

            if(result.length === 0) {
                return null;
            }

            const transactionRow = result[0]!;

            return {
                id: transactionRow.ID,
                fromIban: transactionRow.FROM_IBAN,
                toIban: transactionRow.TO_IBAN,
                amount: transactionRow.AMOUNT,
                status: transactionRow.STATUS as TransactionStatus,
                initiatedAt: transactionRow.INITIATED_AT,
                settledAt: transactionRow.SETTLED_AT
            }
        } catch (err) {
            console.error(`Something happened while fetching transaction with id ${transactionId} for company ${companyId}: ${err}`);
            return null;
        }
    }

    /**
     * Retrieve all transactions belonging to an account, ensuring that the account belongs to the specified company.
     * @param iban 
     * @param companyId 
     * @returns an array of transactions, or an empty array if an error occurs
     */
    async getTransactionsForAccount(iban: string, companyId: number): Promise<Transaction[]> {
        try {
            const connection: Connection = await getDBConnection();

            const result: TransactionRow[] = (await connection.execute<TransactionRow>(`SELECT * FROM es_transactions WHERE (from_iban = :iban OR to_iban = :iban) 
            AND company_id = :companyId`, {
                iban,
                companyId
            })).rows ?? []; 

            await connection.close();

            return result.map(tr => ({
                id: tr.ID,
                fromIban: tr.FROM_IBAN,
                toIban: tr.TO_IBAN,
                amount: tr.AMOUNT,
                status: tr.STATUS,
                initiatedAt: tr.INITIATED_AT,
                settledAt: tr.SETTLED_AT
            }));
        } catch (err) {
            console.error(`Something happened while trying to retrieve transaction for account ${iban}: ${err}`);
            return [];
        }
    }
}