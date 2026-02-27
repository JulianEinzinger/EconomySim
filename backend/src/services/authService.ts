import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

const SECRET_KEY = "mySecretKey";

export interface TokenPayload {
    username: string;
    userId: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if(!token) return res.sendStatus(StatusCodes.UNAUTHORIZED);

    try {
        const payload = jwt.verify(token, SECRET_KEY) as TokenPayload;
        req.user = { username: payload.username, userId: payload.userId };
        next();
    } catch(err) {
        return res.sendStatus(StatusCodes.FORBIDDEN);
    }
};

const DEV_TOKEN = process.env.DEV_TOKEN;

/**
 * Authenticates a development token from the Authorization header. If the token matches the expected development token, it calls the next middleware. If the token is missing or does not match, it sends an appropriate HTTP status code.
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export const authenticateDev = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const devToken = authHeader && authHeader.split(" ")[1];

    if(!devToken) return res.sendStatus(StatusCodes.UNAUTHORIZED);

    if(devToken === DEV_TOKEN) {
        next();
    } else {
        return res.sendStatus(StatusCodes.FORBIDDEN);
    }
}
