import { Router, type Request, type Response } from "express";
import { WholesalerSevice } from "../services/wholesalerService.js";
import type { Wholesaler } from "@economysim/shared";
import { StatusCodes } from "http-status-codes";

export const wholesalerRouter = Router();

wholesalerRouter.get("/", async (req: Request, res: Response) => {
    const service: WholesalerSevice = new WholesalerSevice();

    const wholesalers: Wholesaler[] | null = await service.getAllWholesalers();

    if(!wholesalers) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching wholesalers' });
    } else {
        res.status(StatusCodes.OK).json(wholesalers);
    }
});