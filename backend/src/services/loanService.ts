import { LoanStatus, PaymentStatus, type InstallmentDraft, type Loan, type LoanInstallment, type LoanInstallmentRow, type LoanRow, type LoanType } from "@economysim/shared";
import oracledb, { type Connection } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { getDBConnection } from "../data.js";
import { AccountService } from "./accountService.js";
import { GameConfig } from "../gameConfig.js";
import { CreditScoreService } from "./creditScoreService.js";
import { TransactionService } from "./transactionService.js";
import { MailService } from "./mailService.js";

export class LoanService {
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

    private roundMoney(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private toDbInterestRate(annualRatePercent: number): number {
        return Math.round(annualRatePercent * 100) / 10000;
    }

    private toApiInterestRate(dbRate: number): number {
        const rate = Number(dbRate ?? 0);
        if (rate <= 1) {
            return Math.round(rate * 10000) / 100;
        }
        return Math.round(rate * 100) / 100;
    }

    async applyForLoan(companyId: number, iban: string, principal: number, loanType: LoanType, termMonths: number): Promise<void> {
        const isAccountOwnedByCompany: boolean = await AccountService.getInstance().doesCompanyOwnAccount(iban, companyId);

        if (!isAccountOwnedByCompany) {
            throw new Error("Account not found");
        }

        const availableCapacity = await GameConfig.getAvailableLendingCapacity();

        if (availableCapacity < principal) {
            throw new Error("The central bank has not enough money at the moment");
        }

        const interestRate: number = await CreditScoreService.getInstance().getInterestRateForCompany(companyId);

        const installments = this.generateInstallmentSchedule(principal, interestRate, termMonths);
        const normalizedPrincipal = this.roundMoney(principal);

        const connection: Connection = await getDBConnection();

        try {
            const result = await connection.execute<{ loanId: number }>(`INSERT INTO es_loans (iban, principal, remaining_balance, 
                annual_interest_rate, loan_type, status, end_date) VALUES (:iban, :principal, :remaining_balance, :annual_interest_rate,
                :loan_type, :status, :end_date) RETURNING id INTO :loanId`, {
                    iban,
                    principal: normalizedPrincipal,
                    remaining_balance: normalizedPrincipal,
                    annual_interest_rate: this.toDbInterestRate(interestRate),
                    loan_type: loanType,
                    status: LoanStatus.ACTIVE,
                    end_date: installments[installments.length - 1]?.dueDate,
                    loanId: { dir: BIND_OUT, type: NUMBER }
                }
            );

            const loanId = (result.outBinds as unknown as { loanId: number[] }).loanId[0];

            if (!loanId) {
                throw new Error('Failed to create loan record');
            }

            for(const installment of installments) {
                await connection.execute(`INSERT INTO es_loan_installments (loan_id, due_date, principal_amount, interest_amount, total_amount,
                    remaining_balance, status) VALUES (:loan_id, :due_date, :principal_amount, :interest_amount, :total_amount, 
                    :remaining_balance, :status)`, {
                    loan_id: loanId,
                    due_date: installment.dueDate,
                    principal_amount: this.roundMoney(installment.principalAmount),
                    interest_amount: this.roundMoney(installment.interestAmount),
                    total_amount: this.roundMoney(installment.totalAmount),
                    remaining_balance: this.roundMoney(Math.max(installment.remainingBalance, 0)),
                    status: installment.status
                });
            }
            await connection.commit();

            await TransactionService.getInstance().transfer(GameConfig.CENTRAL_BANK_ACCOUNT_IBAN, iban, normalizedPrincipal, `Loan payout for loan (${loanId})`);
        } finally {
            await connection.close();
        }
    }

    /**
     * Retrieves all loans for a specific company
     * @param companyId 
     * @returns an array of loans, or an empty array if an error occurs
     */
    async getLoansByCompanyId(companyId: number): Promise<Loan[]> {
        try {
            const connection: Connection = await getDBConnection();

            const loansResult = (await connection.execute<LoanRow>(`SELECT l.* FROM es_bank_accounts b JOIN es_loans l ON b.iban = l.iban WHERE b.company_id = :company_id`, {
                company_id: companyId
            })).rows ?? [];

            await connection.close();

            return loansResult.map(lr => ({
                id: lr.ID,
                iban: lr.IBAN,
                principal: lr.PRINCIPAL,
                remainingBalance: lr.REMAINING_BALANCE,
                annualInterestRate: this.toApiInterestRate(lr.ANNUAL_INTEREST_RATE),
                loanType: lr.LOAN_TYPE,
                status: lr.STATUS,
                startDate: lr.START_DATE,
                endDate: lr.END_DATE
            }));
        } catch (err) {
            console.error(`Something happened while trying to retrieve loans for company with id ${companyId}: ${err}`);
            return [];
        }
    }

    /**
     * Retrieves a loan with a specified id
     * @param loanId 
     * @returns a loan object or undefined if an error occurs
     */
    async getInstallmentsByLoanId(loanId: number): Promise<LoanInstallment[]> {
        try {
            const connection: Connection = await getDBConnection();

            const result = (await connection.execute<LoanInstallmentRow>(`SELECT * FROM es_loan_installments WHERE loan_id = :loan_id ORDER BY due_date ASC`, {
                loan_id: loanId
            })).rows ?? [];

            await connection.close();

            return result.map(ir => ({
                id: ir.ID,
                loanId: ir.LOAN_ID,
                dueDate: ir.DUE_DATE,
                paidAt: ir.PAID_AT,
                principalAmount: ir.PRINCIPAL_AMOUNT,
                interestAmount: ir.INTEREST_AMOUNT,
                totalAmount: ir.TOTAL_AMOUNT,
                remainingBalance: ir.REMAINING_BALANCE,
                status: ir.STATUS
            }));
        } catch (err) {
            console.error(`Something happened while trying to retrieve installments for loan ${loanId}: ${err}`);
            return [];
        }
    }

    async getLoanById(loanId: number): Promise<Loan | undefined> {
        try {
            const connection: Connection = await getDBConnection();

            const loanResult = (await connection.execute<LoanRow>(`SELECT * FROM es_loans WHERE id = :loan_id`, {
                loan_id: loanId
            })).rows ?? [];

            await connection.close();

            const loan = loanResult[0];

            if (!loan) {
                throw new Error(`Loan with if ${loanId} was not found`);
            }

            return ({
                id: loan.ID,
                iban: loan.IBAN,
                principal: loan.PRINCIPAL,
                remainingBalance: loan.REMAINING_BALANCE,
                annualInterestRate: this.toApiInterestRate(loan.ANNUAL_INTEREST_RATE),
                loanType: loan.LOAN_TYPE,
                status: loan.STATUS,
                startDate: loan.START_DATE,
                endDate: loan.END_DATE
            })
        } catch (err) {
            console.error(`Something happened while trying to retrieve loan with id ${loanId}: ${err}`);
        }
    }

    async payInstallment(installmentId: number, companyId: number): Promise<void> {
        try {
            const connection: Connection = await getDBConnection();
            const installment = ((await connection.execute<LoanInstallment>(`SELECT * FROM es_loan_installments WHERE id = :installment_id`, {
                installment_id: installmentId
            })).rows ?? [])[0];

            if (!installment) {
                throw new Error(`Loan Installment with id ${installmentId} was not found`);
            }

            const loan = await this.getLoanById(installment.loanId);

            const account = await AccountService.getInstance().getAccountByIBAN(loan!.iban);
            const isAccountOwned: boolean = await AccountService.getInstance().doesCompanyOwnAccount(account!.iban, companyId);

            if (!isAccountOwned) {
                throw new Error(`Company with id ${companyId} does not own account ${account!.iban}`);
            }
            
            if (installment.status === PaymentStatus.PAID) {
                throw new Error("Installment already paid");
            }

            await TransactionService.getInstance().transfer(loan!.iban, GameConfig.CENTRAL_BANK_ACCOUNT_IBAN, installment.totalAmount, `Loan installment (${loan!.id})`);

            await connection.execute(`UPDATE es_loan_installments SET status = :status, paid_at = :date WHERE id = :id`, {
                status: PaymentStatus.PAID,
                date: new Date(),
                id: installmentId
            });

            await connection.execute(`UPDATE es_loans SET remaining_balance = remainingBalance - :amount WHERE id = :id`, {
                amount: installment.principalAmount,
                id: installment.loanId
            });

            const remainingLoan = await this.getLoanById(loan!.id);

            if (remainingLoan!.remainingBalance <= 0) {
                await connection.execute(`UPDATE es_loans SET status = :status WHERE id = :id`, {
                    status: LoanStatus.PAID_OFF,
                    id: loan!.id
                });
            }

            await connection.commit();
            await connection.close();
        } catch (err) {
            console.error(`Something happened while trying to pay off installment with id ${installmentId} for company with id ${companyId}: ${err}`);
        }
    }

    async processOverdueInstallments() {
        try {
            const connection: Connection = await getDBConnection();

            const result = await connection.execute(`UPDATE es_loan_installments SET status = :overdue_status WHERE status = :pending_status AND due_date <= :now`, {
                overdue_status: PaymentStatus.OVERDUE,
                pending_status: PaymentStatus.PENDING,
                now: new Date()
            });
            const overdueInstallments = (await connection.execute<LoanInstallment&{ COMPANY_ID: number, COMPANY_NAME: string }>(`SELECT li.*, b.company_id, c.name AS company_name FROM es_loan_installments li JOIN es_loans l ON li.loan_id = l.id JOIN es_bank_accounts b ON l.iban = b.iban JOIN es_companies c ON b.company_id = c.id WHERE li.status = :pending_status AND li.due_date <= :now`, {
                pending_status: PaymentStatus.PENDING,
                now: new Date()
            })).rows ?? [];

            await connection.commit();
            await connection.close();

            for (const installment of overdueInstallments) {
                await MailService.getInstance().createMail<'installment-reminder'>(installment.COMPANY_ID, `Bank`, `Payment reminder`, 'installment-reminder', {
                    bankName: 'Sparkasse Oberösterreich Bank AG',
                    wholesalerName: installment.COMPANY_NAME,
                    loanNumber: installment.loanId.toString(),
                    dueDate: MailService.formatDate(installment.dueDate),
                    installmentAmount: installment.totalAmount,
                    bankIban: GameConfig.CENTRAL_BANK_ACCOUNT_IBAN
                });
            }
        } catch (err) {
            console.error(`Something happened while trying to process overdue installments: ${err}`);
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