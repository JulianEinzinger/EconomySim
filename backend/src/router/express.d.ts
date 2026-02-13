import { Request } from "express";
import type { TokenPayload } from "../services/authService.ts";

declare global {
    namespace Express {
        export interface Request {
            user?: TokenPayload;
        }
    }
}