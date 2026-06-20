import { Router, type Request, type Response } from "express";
import { authenticateToken } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";
import type { Account, LedgerEntry } from "@economysim/shared";
import { AccountService } from "../services/accountService.js";
import { CompanyService } from "../services/companyService.js";

export const bankRouter = Router();

bankRouter.get("/accounts", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if(isNaN(companyId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid company id' });
    }

    const companyService: CompanyService = new CompanyService();

    if(!(await companyService.isCompanyOwnedByUser(companyId, userId))) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You don\'t have access to this company\'s bank accounts' });
    }

    const accounts: Account[] = await AccountService.getInstance().getAccountsForCompany(companyId);

    res.status(StatusCodes.OK).json(accounts);
});

bankRouter.get("/accounts/:iban", authenticateToken, async (req: Request, res: Response) => {
    const iban: string | undefined = req.params.iban?.toString();

    if(!iban) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid iban' });
    }

    const account: Account | undefined = await AccountService.getInstance().getAccountByIBAN(iban);

    if(!account) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'An error happened. Try again later!' });
    } else {
        res.status(StatusCodes.OK).json(account);
    }
});

bankRouter.get("/accounts/:iban/ledger", authenticateToken, async (req: Request, res: Response) => {
    const iban: string | undefined = req.params.iban?.toString();

    if(!iban) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid iban' });
    }

    const entries: LedgerEntry[] = await AccountService.getInstance().getLedgerEntries(iban);

    res.status(StatusCodes.OK).json({ ledgerEntries: entries });
});