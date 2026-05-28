import type { Connection } from "oracledb";
import { getDBConnection } from "../data.js";
import { PaymentStatus, type LoanInstallment, type LoanInstallmentRow } from "@economysim/shared";

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

        const companyAgeMonths = 0 //TODO: add company founding date in db, add a query here for retrieving age

        const paymentScore: number = this.calculatePaymentScore(installments);
        const ageScore: number = this.calculateAgeScore(companyAgeMonths);
        const debtScore: number = this.calculateDebtScore(0, 0); //TODO: add a query for retrieving total debt and total equity

        // Simple weighted average of the three scores
        const overallScore = Math.round((paymentScore * 0.5) + (ageScore * 0.2) + (debtScore * 0.3));

        return overallScore;
    }

    private calculateAgeScore(companyAgeMonths: number): number {
        return Math.min(companyAgeMonths * 5, 100);
    }

    private calculateDebtScore(totalDebt: number, totalEquity: number): number {
        const debtEquity: number = totalEquity === 0 ? totalDebt : totalDebt / totalEquity;

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
        } else {
            return 10;
        }
    }

    private calculatePaymentScore(installments: LoanInstallment[]): number {
        if(installments.length == 0) return 100;
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