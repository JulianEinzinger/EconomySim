import { Router, type Request, type Response } from "express";
import { ItemService } from "../services/itemService.js";
import type { InventoryItem, Product } from "../model.js";
import { StatusCodes } from "http-status-codes";
import { authenticateToken } from "../services/authService.js";
import { CompanyService } from "../services/companyService.js";

export const itemRouter = Router();

itemRouter.get("/", async (req: Request, res: Response) => {
    const service: ItemService = new ItemService();

    const products: Product[] | null = await service.getAllAvailableItems();

    if(!products) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching products` });
    } else {
        res.status(StatusCodes.OK).json(products);
    }
});

// get all items for a specific warehouse, only if user owns the company that owns the warehouse
itemRouter.get("/warehouses/:warehouseId", authenticateToken, async (req: Request, res: Response) => {
    const warehouseId: number = Number(req.params.warehouseId);
    if(isNaN(warehouseId) || warehouseId < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid warehouseId ID" });
    }

    const companyService: CompanyService = new CompanyService();
    const itemService: ItemService = new ItemService();
    const userId: number = req.user!.userId;

    // check if warehouse is owned by user
    const companyId: number | null = await companyService.getCompanyIdForWarehouseId(warehouseId);
    const isOwned: boolean = companyId != null && await companyService.isCompanyOwnedByUser(companyId, userId);

    if(!isOwned) {
        res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this warehouse's items" });
    } else {
        const items: InventoryItem[] | null = await itemService.getItemsByWarehouseId(warehouseId);

        if(items == null) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching items for warehouse" });
        } else {
            res.status(StatusCodes.OK).json(items);
        }
    }
});