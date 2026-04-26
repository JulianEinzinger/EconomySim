import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { WholesalerSevice } from "../services/wholesalerService.js";
import { DeliveryStatus, PaymentStatus, type WholesalerOrder, type WholesalerOrderItem } from "@economysim/shared";
import { CompanyService } from "../services/companyService.js";
import { authenticateToken } from "../services/authService.js";

export const orderRouter = Router();

orderRouter.get("/", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.query.companyId);
    const userId: number = req.user!.userId;

    if(isNaN(companyId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid company ID' });
    }

    const wholesalerService: WholesalerSevice = new WholesalerSevice();
    const companyService: CompanyService = new CompanyService();

    // check if the company belongs to the user
    if(!await companyService.isCompanyOwnedByUser(companyId, userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this company" });
    }

    const orders: WholesalerOrder[] = await wholesalerService.getOrdersByCompanyId(companyId);

    if(!orders) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching order for company id: ${companyId}` });
    } else {
        return res.status(StatusCodes.OK).json(orders)
    }
});

orderRouter.get("/:orderId/items", authenticateToken ,async (req: Request, res: Response) => {
    const orderId: number = Number(req.params.orderId);
    const userId: number = req.user!.userId;

    if(isNaN(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid order ID' });
    }

    const wholesalerService: WholesalerSevice = new WholesalerSevice();
    const companyService: CompanyService = new CompanyService();

    // check if company of order is owned by the user
    const companyId: number = await wholesalerService.getCompanyIdForOrderId(orderId);
    if(!await companyService.isCompanyOwnedByUser(companyId, userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this order" });
    }

    const itemsResult = await wholesalerService.getOrderItems(orderId, companyId);

    if(itemsResult === 'forbidden') {
        // cant happen, but anyway:
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'This company does not have access to this order' });
        
    } else if(!itemsResult) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching order items for order id: ${orderId}` });
    } else {
        return res.status(StatusCodes.OK).json(itemsResult);
    }
});

orderRouter.put("/:orderId/pay", authenticateToken, async (req: Request, res: Response) => {
    const orderId: number = Number(req.params.orderId);
    const bankAccountId: number = Number(req.body.bankAccountId);
    const userId: number = req.user!.userId;

    if(isNaN(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid order ID' });
    }

    const wholesalerService: WholesalerSevice = new WholesalerSevice();
    const companyService: CompanyService = new CompanyService();

    // check if company of order is owned by the user
    const companyId: number = await wholesalerService.getCompanyIdForOrderId(orderId);
    if (!await companyService.isCompanyOwnedByUser(companyId, userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this order" });
    }

    await wholesalerService.payOrder(orderId, bankAccountId);
    res.status(StatusCodes.OK).json({ message: `Successfully paid order #(${orderId})` });
});