import { Router, type Request, type Response } from "express";
import { authenticateToken } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";
import { MailService } from "../services/mailService.js";
import type { Mail } from "@economysim/shared";
import { CompanyService } from "../services/companyService.js";

export const mailRouter = Router();

mailRouter.get("/", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);

    if(isNaN(companyId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid company id' });
    }

    const service: MailService = new MailService();

    const mails: Mail[] = await service.getAllMailsForCompany(companyId);

    res.status(StatusCodes.OK).json(mails);
});

mailRouter.get("/:mailId", authenticateToken, async (req: Request, res: Response) => {
    const mailId: number = Number(req.params.mailId);
    const userId: number = req.user!.userId;

    if(isNaN(mailId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid mail id' });
    }

    const mailService: MailService = new MailService();
    const companyService: CompanyService = new CompanyService();

    const mail: Mail | null = await mailService.getMailById(mailId);

    if(!mail) {
        res.status(StatusCodes.NOT_FOUND).json({ message: `Mail not found` });
    } else {
        if(await companyService.isCompanyOwnedByUser(mail.recipientId, userId)) {
            // company von mail gehört user
            res.status(StatusCodes.OK).json(mail);
        } else {
            res.status(StatusCodes.FORBIDDEN).json('You do not have access to this mail');
        }
    }
});

mailRouter.post("/:mailId/read", authenticateToken, async (req: Request, res: Response) => {
    const mailId: number = Number(req.params.mailId);
    const userId: number = req.user!.userId;

    if(isNaN(mailId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid mail id' });
    }

    const mailService: MailService = new MailService();
    const companyService: CompanyService = new CompanyService();

    const mail: Mail | null = await mailService.getMailById(mailId);

    if(!mail) {
        res.status(StatusCodes.NOT_FOUND).json({ message: `Mail not found` });
    } else {
        if(await companyService.isCompanyOwnedByUser(mail.recipientId, userId)) {
            // company von mail gehört user
            const result: boolean = await mailService.markAsRead(mailId, mail.recipientId);
            if(result) {
                res.status(StatusCodes.OK).json(mail.id);
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong!' });
            }
        } else {
            res.status(StatusCodes.FORBIDDEN).json('You do not have access to this mail');
        }
    }
});

mailRouter.post("/:mailId/archive", authenticateToken, async (req: Request, res: Response) => {
    const mailId: number = Number(req.params.mailId);
    const userId: number = req.user!.userId;

    if(isNaN(mailId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid mail id' });
    }

    const mailService: MailService = new MailService();
    const companyService: CompanyService = new CompanyService();

    const mail: Mail | null = await mailService.getMailById(mailId);

    if(!mail) {
        res.status(StatusCodes.NOT_FOUND).json({ message: `Mail not found` });
    } else {
        if(await companyService.isCompanyOwnedByUser(mail.recipientId, userId)) {
            // company von mail gehört user
            const result: boolean = await mailService.archiveMail(mailId, mail.recipientId);
            if(result) {
                res.status(StatusCodes.OK).json(mail.id);
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong!' });
            }
        } else {
            res.status(StatusCodes.FORBIDDEN).json('You do not have access to this mail');
        }
    }
});