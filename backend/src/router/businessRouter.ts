import { Router, type Request, type Response } from "express";
import { BusinessService } from "../services/businessService.js";
import type { BusinessType } from "../model.js";
import { StatusCodes } from "http-status-codes";
import { authenticateToken } from "../services/authService.js";
import { CompanyService } from "../services/companyService.js";

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

businessRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const b = req.body;
    const [name, businessTypeId, countryCode, cityName, primColor, secColor]: [string, number, string, string, string, string] = 
            [req.body.name, b.businessTypeId, b.countryCode, b.city, b.primaryColor, b.secondaryColor];
    const userId: number = req.user!.userId;

    const service: CompanyService = new CompanyService();

    const [companyId, msg]: [number, string] = await service.foundNewCompany(userId, name, businessTypeId, countryCode, cityName, primColor, secColor);

    if(companyId == -1) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: msg });
    } else {
        res.status(StatusCodes.OK).json({ companyId: companyId, message: msg });
    }
});