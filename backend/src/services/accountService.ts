import type { Account, AccountRow, AccountType, LedgerEntry, LedgerEntryRow } from "@economysim/shared";
import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";

export class AccountService {
    /**
     * Creates a new bank account and returns it's IBAN
     * @param companyId id of the company to create the bank account for
     * @param accountType 
     * @param name name for the bank account to be displayed
     * @returns the IBAN of the newly created bank account
     * @throws an error, if something went wrong
     */
    public async createAccount(companyId: number, accountType: AccountType, name: string): Promise<string> {
        const connection: Connection = await getDBConnection();

        const iban = this.generateNewIBAN();

        connection.execute(`INSERT INTO es_bank_accounts (iban, name, company_id, account_type, balance, currency) VALUES
        (:iban, :name, :company_id, :account_type, :balance, :currency)`, {
            iban: iban,
            name: name,
            company_id: companyId,
            account_type: accountType,
            balance: 0,
            currency: 'EUR'
        });

        await connection.commit();
        await connection.close();

        return iban;
    }

    private generateNewIBAN(): string {
        function randomNumber(length: number): string {
            let result = "";
            const characters = "0123456789";
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        }

        function mod97(ibanNumeric: string): number {
            let remainder = 0;

            for (const digit of ibanNumeric) {
                remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
            }

            return remainder;
        }
        
        function calculateCheckDigits (ibanWithoutCheckDigits: string): string {
            // Buchstaben in Zahlen umwandeln (A=10, ... Z=35)
            const rearranged = ibanWithoutCheckDigits.slice(4) + ibanWithoutCheckDigits.slice(0, 4);
            console.log('rearranged: ' +rearranged)
            const converted = rearranged.split("").map(char => {
                if (char >= "0" && char <= "9") {
                    return char;
                }
                return (char.charCodeAt(0) - 55).toString();
            }).join("");

            console.log(converted)

            // MOD 97 Berechnung
            const remainder = mod97(converted);
            console.log(remainder);
            const checkDigits = 98 - remainder;
            return checkDigits.toString().padStart(2, "0");
        }

        const countryCode = "AT";
        const bankCode = "20111"; // Erste Bank und Sparkasse
        const accountNumber = randomNumber(11);

        const ibanWithoutCheckDigits = countryCode + "00" + bankCode + accountNumber;
        const checkDigits = calculateCheckDigits(ibanWithoutCheckDigits);
        return countryCode + checkDigits + bankCode + accountNumber;
    }

    /**
     * Retrieves all bank accounts belonging to a specific company
     * @param companyId 
     * @returns an array of bank accounts, or an empty array, if an error occurs
     */
    public async getAccountsForCompany(companyId: number): Promise<Account[]> {
        try {
            const connection: Connection = await getDBConnection();

            const result: AccountRow[] = (await connection.execute<AccountRow>(`SELECT * FROM es_bank_accounts WHERE company_id = :company_id`, {
                company_id: companyId
            })).rows ?? [];

            await connection.close();

            return result.map(ar => ({
                iban: ar.IBAN,
                name: ar.NAME,
                companyId: ar.COMPANY_ID,
                accountType: ar.ACCOUNT_TYPE,
                balance: ar.BALANCE,
                currency: ar.CURRENCY,
                createdAt: ar.CREATED_AT
            }));
        } catch (err) {
            console.error(`Something happened while trying to retrieve bank accounts for company with id ${companyId}: ${err}`);
            return [];
        }
    }

    /**
     * Retrieves an account for a company by it's iban
     * @param iban 
     * @param companyId 
     * @returns an bank account, or undefined if no account was found
     */
    public async getAccountByIBAN(iban: string, companyId: number): Promise<Account | undefined> {
        try {
            const connection: Connection = await getDBConnection();

            const result: AccountRow[] = (await connection.execute<AccountRow>(`SELECT * FROM es_bank_accounts WHERE iban = :iban AND company_id = :company_id`, {
                iban: iban,
                company_id: companyId
            })).rows ?? [];

            await connection.close();

            const accs: Account[] = result.map(ar => ({
                iban: ar.IBAN,
                name: ar.NAME,
                companyId: ar.COMPANY_ID,
                accountType: ar.ACCOUNT_TYPE,
                balance: ar.BALANCE,
                currency: ar.CURRENCY,
                createdAt: ar.CREATED_AT
            }));

            if(accs.length > 0) {
                return accs[0];
            }

            return undefined;
        } catch (err) {
            console.error(`Something happened while trying to retrieve bank account with IBAN ${iban}: ${err}`);
            return undefined;
        }
    }

    /**
     * REtrieves the current balance of an account
     * @param iban 
     * @param companyId 
     */
    public async getAccountBalance(iban: string, companyId: number): Promise<number> {
        const connection: Connection = await getDBConnection();

        const result: { BALANCE: number }[] = (await connection.execute<{ BALANCE: number }>(`SELECT balance FROM es_bank_accounts WHERE iban = :iban AND company_id = :company_id`, {
            iban: iban,
            company_id: companyId
        })).rows ?? [];

        await connection.close();

        if(result.length > 0) {
            return result[0]!.BALANCE;
        } else {
            throw new Error(`Account was not found or company doesn't have access to it.`);
        }
    }

    /**
     * Retrieves all ledger entries from an bank account
     * @param iban 
     * @param companyId 
     * @returns an array of ledger entries, or an empty array if the bank account was not found or it doesn't belong to the company
     */
    public async getLedgerEntries(iban: string, companyId: number): Promise<LedgerEntry[]> {
        const connection: Connection = await getDBConnection();

        const result: LedgerEntryRow[] = (await connection.execute<LedgerEntryRow>(`SELECT e.* FROM es_ledger_entries e JOIN es_bank_accounts b ON e.iban = b.iban
             WHERE iban = :iban AND b.company_id = :company_id`, {
            iban: iban,
            company_id: companyId
        })).rows ?? [];

        await connection.close();

        return result.map(lr => ({
            id: lr.ID,
            iban: lr.IBAN,
            transactionId: lr.TRANSACTION_ID,
            amount: lr.AMOUNT,
            entryType: lr.ENTRY_TYPE,
            bookedAt: lr.BOOKED_AT,
            description: lr.DESCRIPTION
        }));        
    }
}