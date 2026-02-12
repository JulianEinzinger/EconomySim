import { Router, type Request, type Response } from "express";
import { UserService } from "../services/userService.js";
import type { User } from "../model.js";
import { StatusCodes } from "http-status-codes";

export const userRouter = Router();

userRouter.get("/", async (req: Request, res: Response) => {
    const service: UserService = new UserService();
    const users: User[] = await service.getAllUsers();

    res.status(StatusCodes.OK).json(users);
});

userRouter.post("/", async (req: Request, res: Response) => {
    const username: string = req.body.username;
    const password: string = req.body.password;

    if(!username || !password) {
        return res.status(StatusCodes.BAD_REQUEST);
    }

    const service: UserService = new UserService();
    const userId: number = await service.createNewUser(username, password);

    res.status(StatusCodes.CREATED).send(userId);
});