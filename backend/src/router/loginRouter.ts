import { Router, type Request, type Response } from "express";
import { UserService } from "../services/userService.js";
import { StatusCodes } from "http-status-codes";

export const loginRouter = Router();

loginRouter.post("/", async (req: Request, res: Response) => {
    const [username, password]: [string, string] = [req.body.username, req.body.password];

    const service: UserService = new UserService();

    const success: boolean = await service.checkUserCredentials(username, password);

    if(success) {
        res.status(StatusCodes.OK).json({ message: "Login successful!" });
    } else {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid username or password!" });
    }
});