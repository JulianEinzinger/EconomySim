import { Router, type Request, type Response } from "express";
import { WholesalerService } from "../services/wholesalerService.js";
import type { Wholesaler, WholesalerOrderItem } from "@economysim/shared";
import { StatusCodes } from "http-status-codes";
import { authenticateToken } from "../services/authService.js";
import { CompanyService } from "../services/companyService.js";

export const wholesalerRouter = Router();

wholesalerRouter.get("/", async (req: Request, res: Response) => {
    const service: WholesalerService = new WholesalerService();

    const wholesalers: Wholesaler[] | null = await service.getAllWholesalers();

    if(!wholesalers) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching wholesalers' });
    } else {
        res.status(StatusCodes.OK).json(wholesalers);
    }
});

wholesalerRouter.post("/purchase", authenticateToken, async (req: Request, res: Response) => {
    const { companyId, wholesalerId, items }: { companyId:number, wholesalerId: number, items: WholesalerOrderItem[] } = req.body;
    const userId: number = req.user!.userId;

    const companyService: CompanyService = new CompanyService();
    if(!await companyService.isCompanyOwnedByUser(companyId, userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this company!" });
    }

    const service: WholesalerService = new WholesalerService();
    
    const result = await service.createOrder(companyId, wholesalerId, items);

    if(result.success) {
        res.status(StatusCodes.OK).json({ message: `Purchase successful! (${result.orderId})` });
    } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error processing purchase!' });
    }
});