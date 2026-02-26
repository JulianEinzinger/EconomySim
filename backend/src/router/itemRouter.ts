import { Router, type Request, type Response } from "express";
import { ItemService } from "../services/itemService.js";
import type { Product } from "../model.js";
import { StatusCodes } from "http-status-codes";

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