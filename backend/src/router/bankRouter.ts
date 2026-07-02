import { Router, type Request, type Response } from "express";
import { authenticateToken } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";
import { AccountType, type Account, type LedgerEntry, type Loan, type LoanInstallment, type LoanType } from "@economysim/shared";
import { AccountService } from "../services/accountService.js";
import { CompanyService } from "../services/companyService.js";
import { CreditScoreService } from "../services/creditScoreService.js";
import { LoanService } from "../services/loanService.js";

export const bankRouter = Router();

async function assertCompanyAccess(companyId: number, userId: number, res: Response): Promise<boolean> {
    if (isNaN(companyId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid company id' });
        return false;
    }

    const companyService = new CompanyService();

    if (!(await companyService.isCompanyOwnedByUser(companyId, userId))) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You don\'t have access to this company' });
        return false;
    }

    return true;
}

bankRouter.get("/accounts", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const accounts: Account[] = await AccountService.getInstance().getAccountsForCompany(companyId);

    res.status(StatusCodes.OK).json(accounts);
});

bankRouter.get("/accounts/:iban", authenticateToken, async (req: Request, res: Response) => {
    const iban: string | undefined = req.params.iban?.toString();
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!iban) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid iban' });
    }

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const ownsAccount = await AccountService.getInstance().doesCompanyOwnAccount(iban, companyId);

    if (!ownsAccount) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You don\'t have access to this account' });
    }

    const account: Account | undefined = await AccountService.getInstance().getAccountByIBAN(iban);

    if (!account) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Account not found' });
    } else {
        res.status(StatusCodes.OK).json(account);
    }
});

bankRouter.get("/accounts/:iban/ledger", authenticateToken, async (req: Request, res: Response) => {
    const iban: string | undefined = req.params.iban?.toString();
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!iban) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid iban' });
    }

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const ownsAccount = await AccountService.getInstance().doesCompanyOwnAccount(iban, companyId);

    if (!ownsAccount) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You don\'t have access to this account' });
    }

    const entries: LedgerEntry[] = await AccountService.getInstance().getLedgerEntries(iban);

    res.status(StatusCodes.OK).json({ ledgerEntries: entries });
});

bankRouter.post("/accounts", authenticateToken, async (req: Request, res: Response) => {
    const { companyId, accountName }: { companyId: number, accountName: string } = req.body;
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(Number(companyId), userId, res))) {
        return;
    }

    if (!accountName?.trim()) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Account name is required' });
    }

    try {
        const iban: string = await AccountService.getInstance().createAccount(companyId, AccountType.GIRO, accountName.trim());

        res.status(StatusCodes.CREATED).json({ iban });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create account' });
    }
});

bankRouter.get("/credit-score", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const score = await CreditScoreService.getInstance().recalculateScore(companyId);

    res.status(StatusCodes.OK).json({ creditScore: score });
});

bankRouter.get("/interest-rate", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const interestRate = await CreditScoreService.getInstance().getInterestRateForCompany(companyId);

    res.status(StatusCodes.OK).json({ interestRate });
});

bankRouter.get("/loans", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const loans: Loan[] = await LoanService.getInstance().getLoansByCompanyId(companyId);

    res.status(StatusCodes.OK).json(loans);
});

bankRouter.get("/loans/:loanId/installments", authenticateToken, async (req: Request, res: Response) => {
    const loanId: number = Number(req.params.loanId);
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if (isNaN(loanId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid loan id' });
    }

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    const loan = await LoanService.getInstance().getLoanById(loanId);

    if (!loan) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Loan not found' });
    }

    const ownsAccount = await AccountService.getInstance().doesCompanyOwnAccount(loan.iban, companyId);

    if (!ownsAccount) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You don\'t have access to this loan' });
    }

    const installments: LoanInstallment[] = await LoanService.getInstance().getInstallmentsByLoanId(loanId);

    res.status(StatusCodes.OK).json(installments);
});

bankRouter.post("/loans", authenticateToken, async (req: Request, res: Response) => {
    const { companyId, iban, principal, loanType, termMonths }: {
        companyId: number,
        iban: string,
        principal: number,
        loanType: LoanType,
        termMonths: number
    } = req.body;
    const userId: number = req.user!.userId;

    if (!(await assertCompanyAccess(Number(companyId), userId, res))) {
        return;
    }

    if (!iban || isNaN(Number(principal)) || principal <= 0 || isNaN(Number(termMonths)) || termMonths <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid loan application data' });
    }

    try {
        await LoanService.getInstance().applyForLoan(companyId, iban, principal, loanType, termMonths);
        res.status(StatusCodes.CREATED).json({ message: 'Loan application submitted' });
    } catch (err) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: err instanceof Error ? err.message : 'Failed to apply for loan' });
    }
});

bankRouter.post("/loans/installments/:installmentId/pay", authenticateToken, async (req: Request, res: Response) => {
    const installmentId: number = Number(req.params.installmentId);
    const companyId: number = Number(req.body.companyId);
    const userId: number = req.user!.userId;

    if (isNaN(installmentId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid installment id' });
    }

    if (!(await assertCompanyAccess(companyId, userId, res))) {
        return;
    }

    await LoanService.getInstance().payInstallment(installmentId, companyId);

    res.status(StatusCodes.OK).json({ message: 'Installment paid' });
});
