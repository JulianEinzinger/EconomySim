import { Router, type Request, type Response } from "express";
import { authenticateDev } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";
import { ItemService } from "../services/itemService.js";
import { GameConfig } from "../gameConfig.js";
import { CreditScoreService } from "../services/creditScoreService.js";

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

devRouter.get("/bank-capacity", authenticateDev, async (req: Request, res: Response) => {
    const cap: number = await GameConfig.getAvailableLendingCapacity();

    res.status(StatusCodes.OK).json({ LendingCapacity: cap });
});

devRouter.get("/creditscore", authenticateDev, async (req: Request, res: Response) => {
    const creditScore: number = await CreditScoreService.getInstance().recalculateScore(Number(req.query.companyId));

    res.status(StatusCodes.OK).json({ CreditScore: creditScore });
});

devRouter.get("/rate", authenticateDev, async (req: Request, res: Response) => {
    const interestRate: number = await CreditScoreService.getInstance().getInterestRateForCompany(Number(req.query.companyId));

    res.status(StatusCodes.OK).json({ "Interest Rate": interestRate });
});