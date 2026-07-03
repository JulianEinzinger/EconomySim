import { Router, type Request, type Response } from "express";
import { WholesalerService } from "../services/wholesalerService.js";
import type { Company, Wholesaler, WholesalerOrder, WholesalerOrderItem } from "@economysim/shared";
import { StatusCodes } from "http-status-codes";
import { authenticateToken } from "../services/authService.js";
import { CompanyService } from "../services/companyService.js";
import { MailService } from "../services/mailService.js";

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
        // Bestellbestätigung senden
        const wholesalerService: WholesalerService = new WholesalerService();
        const order: WholesalerOrder | null = await service.getOrderById(result.orderId);
        const wholesaler: Wholesaler | undefined = (await wholesalerService.getAllWholesalers())?.find(w => w.id === wholesalerId);
        const companyName: string = ((await companyService.getCompanyByIdForUser(companyId, userId)) as any as Company).name; // ist fix eine company

        if(!order) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Order was not created...' });
        }

        if(!wholesaler) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Couldn\'t find wholesaler...' });
        }

        const mailService: MailService = new MailService();

        await mailService.createMail(companyId, wholesaler.name, `Order Confirmation #${result.orderId}`, 'order-confirmation', {
            orderId: result.orderId,
            wholesalerName: wholesaler.name,
            companyName: companyName,
            products: order.items,
            totalPrice: order.totalPrice
        });
        res.status(StatusCodes.OK).json({ message: `Purchase successful! (${result.orderId})` });
    } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error processing purchase!' });
    }
});