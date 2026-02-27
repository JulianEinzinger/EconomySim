import { Router, type Request, type Response } from "express";
import { UserService } from "../services/userService.js";
import { StatusCodes } from "http-status-codes";
import { createToken } from "../services/authService.js";

export const loginRouter = Router();

loginRouter.post("/", async (req: Request, res: Response) => {
    const [username, password]: [string, string] = [req.body.username, req.body.password];

    const service: UserService = new UserService();

    const [success, userId]: [boolean, number] = await service.checkUserCredentials(username, password);

    if(success) {
        // create token
        const token: string = createToken(username, userId);
        
        res.status(StatusCodes.OK).json({ token: token, message: "Login successful!!" });
    } else {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid username or password!" });
    }
});