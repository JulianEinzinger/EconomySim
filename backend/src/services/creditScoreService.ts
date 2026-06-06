import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import { PaymentStatus, type InventoryItem, type LoanInstallment, type LoanInstallmentRow } from "@economysim/shared";
import { ItemService } from "./itemService.js";

export class CreditScoreService {
    //#region Singleton
    private static instance: CreditScoreService;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): CreditScoreService {
        if (!CreditScoreService.instance) {
            CreditScoreService.instance = new CreditScoreService();
        }

        return CreditScoreService.instance;
    }

    //#endregion

    async recalculateScore(companyId: number): Promise<number> {
        const connection: Connection = await getDBConnection();
        const installmentsResult: LoanInstallmentRow[] = (await connection.execute<LoanInstallmentRow>("SELECT li.* FROM es_bank_accounts ba JOIN es_loans l ON ba.iban = l.iban JOIN es_loan_installments li ON l.id = li.loan_id WHERE company_id = :company_id", {
            company_id: companyId
        })).rows ?? [];
        const installments: LoanInstallment[] = installmentsResult.map(ir => ({
            id: ir.ID,
            loanId: ir.LOAN_ID,
            dueDate: ir.DUE_DATE,
            paidAt: ir.PAID_AT,
            principalAmount: ir.PRINCIPAL_AMOUNT,
            interestAmount: ir.INTEREST_AMOUNT,
            remainingBalance: ir.REMAINING_BALANCE,
            totalAmount: ir.TOTAL_AMOUNT,
            status: ir.STATUS
        }));

        const companyAgeResult = (await connection.execute<{ FOUNDING_DATE: Date }>(`SELECT founding_date FROM es_companies WHERE id = :id`, {
            id: companyId
        })).rows ?? [];

        const totalOutstandingLoansResult = (await connection.execute<{ TOTAL_LOANS: number }>(`SELECT SUM(l.remaining_balance) AS total_loans FROM es_bank_accounts ba JOIN es_loans l ON ba.iban = l.iban WHERE ba.company_id = :company_id`, {
            company_id: companyId
        })).rows ?? [{ TOTAL_LOANS: 0 }];

        const totalOutstandingLoans: number = totalOutstandingLoansResult[0]?.TOTAL_LOANS ?? 0;

        const totalBalanceResult = (await connection.execute<{ TOTAL_BALANCE: number }>(`SELECT SUM(balance) AS total_balance FROM es_bank_accounts WHERE company_id = :company_id`, {
            company_id: companyId
        })).rows ?? [{ TOTAL_BALANCE: 0}];

        const totalBalance: number = totalBalanceResult[0]?.TOTAL_BALANCE ?? 0;

        await connection.close();

        const itemService: ItemService = new ItemService();

        const warehouses = await itemService.getWarehousesByCompanyId(companyId) ?? [];
        const items: InventoryItem[] = warehouses[0]?.items ?? [];

        const inventoryValue: number = warehouses.reduce((wareHouseSum, warehouse) => wareHouseSum + warehouse.items.reduce((sum, item) => sum + item.quantity * item.marketPrice, 0), 0);

        const equity: number = totalBalance - totalOutstandingLoans + inventoryValue;

        if(companyAgeResult.length < 1) {
            console.error(`Company not found!`);
            return -1; //TODO: handle this case properly
        }

        const companyAgeMonths: number = (new Date().getTime() - companyAgeResult[0]!.FOUNDING_DATE.getTime()) / 1000 / 60 / 60 / 24 / 30;

        const paymentScore: number = this.calculatePaymentScore(installments);
        const ageScore: number = this.calculateAgeScore(companyAgeMonths);
        const debtScore: number = this.calculateDebtScore(totalOutstandingLoans, equity); // future improvement: consider total assets including machines, farmlands, etc.

        // Simple weighted average of the three scores (300-850)
        const overallScore = Math.round((paymentScore * 0.6 + ageScore * 0.15 + debtScore * 0.25) * 5.5 + 300);

        return inventoryValue;
        return overallScore;
    }

    private calculateAgeScore(companyAgeMonths: number): number {
        return Math.min(companyAgeMonths * 5, 100);
    }

    private calculateDebtScore(totalDebt: number, totalEquity: number): number {
        if(totalEquity <= 0) {
            return 10;
        }
        const debtEquity: number =  totalDebt / totalEquity;

        if (debtEquity < 0.3) {
            return 100;
        } else if (debtEquity < 0.5) {
            return 90;
        } else if (debtEquity < 1) {
            return 75;
        } else if (debtEquity < 2) {
            return 50;
        } else if (debtEquity < 3) {
            return 25;
        }

        return 10;
    }

    private calculatePaymentScore(installments: LoanInstallment[]): number {
        if(installments.length == 0) return 70; // No payment history => neutral score
        let totalWeight = 0;
        let achievedWeight = 0;

        for (const installment of installments) {

            totalWeight += 1;

            // Komplett ausgefallen
            if (
                installment.status === PaymentStatus.OVERDUE &&
                !installment.paidAt
            ) {
                continue;
            }

            if (!installment.paidAt) {
                console.log("NO PAY DATE");
                continue;
            }

            const lateDays = Math.max(0, Math.floor((installment.paidAt.getTime() -installment.dueDate.getTime()) / 86400000));

            if (lateDays === 0) {
                achievedWeight += 1.0;
            }
            else if (lateDays <= 7) {
                achievedWeight += 0.9;
            }
            else if (lateDays <= 30) {
                achievedWeight += 0.7;
            }
            else if (lateDays <= 90) {
                achievedWeight += 0.4;
            }
            else {
                achievedWeight += 0.1;
            }
        }

        console.log(`Achieved Weight: ${achievedWeight} | Total Weight: ${totalWeight}`);
        return Math.round((achievedWeight / totalWeight) * 100);
    }
}