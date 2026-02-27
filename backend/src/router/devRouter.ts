import { Router, type Request, type Response } from "express";
import { authenticateDev } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";
import { ItemService } from "../services/itemService.js";

export const devRouter = Router();

devRouter.post("/products", authenticateDev, async (req: Request, res: Response) => {
    const name = req.body?.name;
    const imgUrl = req.body?.imgUrl;
    const productCategoryId = Number(req.body?.productCategoryId);
    const unit = req.body?.unit;
    
    if(!name || !imgUrl || !productCategoryId || !unit) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing required fields' });
    }
    if(isNaN(productCategoryId) || productCategoryId <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid product category id' });
    }
    

    const service: ItemService = new ItemService();

    const [productId, message] = await service.createNewProduct(name, imgUrl, productCategoryId, unit);

    if(!productId) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message });
    } else {
        res.status(StatusCodes.CREATED).json({ message, productId });
    }
});