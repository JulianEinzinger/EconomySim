import { PaymentStatus, type Account, type InstallmentDraft, type LoanType } from "@economysim/shared";
import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import { AccountService } from "./accountService.js";
import { GameConfig } from "../gameConfig.js";

class LoanService {
    //#region Singleton
    private static instance: LoanService;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): LoanService {
        if(!LoanService.instance) {
            LoanService.instance = new LoanService();
        }

        return LoanService.instance;
    }

    //#endregion

    async applyForLoan(companyId: number, iban: string, principal: number, loanType: LoanType, termMonths: number): Promise<void> {
        try {
            const isAccountOwnedByCompany: boolean = await AccountService.getInstance().doesCompanyOwnAccount(iban, companyId);

            if (!isAccountOwnedByCompany) {
                throw new Error("Account not found");
            }

            const availableCapacity = await GameConfig.getAvailableLendingCapacity();

            if (availableCapacity < principal) {
                throw new Error("The central bank has not enough money at the moment");
            }

            const connection: Connection = await getDBConnection();

            await connection.execute(``);
        } catch(err) {
            console.error(`Something happened while applying for a loan for company ${companyId} with IBAN ${iban}:`, err);
        }
    }

    /**
     * Generates an installment schedule based on the given parameters using the annuity formula.
     * @param principal The total amount of the loan.
     * @param annualRate The annual interest rate (in percentage). e.g., for 5% interest, pass 5.
     * @param months The number of months for the loan term.
     * @returns An array of installment details.
     */
    private generateInstallmentSchedule(principal: number, annualRate: number, months: number): InstallmentDraft[] {
        const monthlyRate = annualRate / 12 / 100;

        const annuity = principal * ((monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1));

        let remainingBalance = principal;

        const installments: InstallmentDraft[] = [];

        for (let month = 1; month <= months; month++) {
            const interestAmount: number = remainingBalance * monthlyRate;
            const principalAmount: number = annuity - interestAmount;

            remainingBalance -= principalAmount;

            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + month);

            // round2 is a helper function to round to 2 decimal places
            function round2(num: number): number {
                return Math.round(num * 100) / 100;
            }

            installments.push({
                dueDate,
                principalAmount: round2(principalAmount),
                interestAmount: round2(interestAmount),
                totalAmount: round2(annuity),
                remainingBalance: round2(remainingBalance), // evtl. round2(Math.max(remainingBalance, 0))
                status: PaymentStatus.PENDING
            });
        }

        return installments;
    }
}