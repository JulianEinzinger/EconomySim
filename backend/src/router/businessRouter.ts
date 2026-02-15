import { Router, type Request, type Response } from "express";
import { BusinessService } from "../services/businessService.js";
import type { BusinessType } from "../model.js";
import { StatusCodes } from "http-status-codes";

export const businessRouter = Router();

businessRouter.get("/businessTypes", async (req: Request, res: Response) => {
    const service: BusinessService = new BusinessService();

    const businessTypes: BusinessType[] | null = await service.getAllBusinessTypes();

    if(!businessTypes) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching business types` });
    } else {
        res.status(StatusCodes.OK).json(businessTypes);
    }
});