import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

const SECRET_KEY = "mySecretKey";

interface TokenPayload {
    username: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if(!token) return res.sendStatus(StatusCodes.UNAUTHORIZED);

    try {
        const payload = jwt.verify(token, SECRET_KEY) as TokenPayload;
        req.user = { username: payload.username };
        next();
    } catch(err) {
        return res.sendStatus(StatusCodes.FORBIDDEN);
    }
};