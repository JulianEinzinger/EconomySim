import { Router, type Request, type Response } from "express";
import { BusinessService } from "../services/businessService.js";
import type { BusinessType, Company, Warehouse } from "../model.js";
import { StatusCodes } from "http-status-codes";
import { authenticateToken } from "../services/authService.js";
import { CompanyService } from "../services/companyService.js";
import { ItemService } from "../services/itemService.js";

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

businessRouter.get("/companies/:companyId", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.params.companyId);
    if(isNaN(companyId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid company ID" });
    }

    const service: CompanyService = new CompanyService();
    const userId: number = req.user!.userId;
    

    const company = await service.getCompanyByIdForUser(companyId, userId);

    if(company === "forbidden") {
        res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this company" });
    } else if(!company) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Company not found" });
    } else {
        res.status(StatusCodes.OK).json(company);
    }
});

// get all warehouses for a specific company
businessRouter.get("/companies/:companyId/warehouses", authenticateToken, async (req: Request, res: Response) => {
    const companyId: number = Number(req.params.companyId);
    if(isNaN(companyId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid company ID" });
    }

    const companyService: CompanyService = new CompanyService();
    const itemService: ItemService = new ItemService();
    const userId: number = req.user!.userId;

    // check if the company belongs to the user
    if(!await companyService.isCompanyOwnedByUser(companyId, userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this company's warehouses" });
    }

    const warehouses: Warehouse[] | null = await itemService.getWarehousesByCompanyId(companyId);

    if(!warehouses) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching warehouses for company id: ${companyId}` });
    } else {
        res.status(StatusCodes.OK).json(warehouses);
    }
});