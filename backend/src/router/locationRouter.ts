import { Router, type Request, type Response } from "express";
import { LocationService } from "../services/locationService.js";
import type { Country } from "../model.js";
import { StatusCodes } from "http-status-codes";

export const locationRouter = Router();

locationRouter.get("/countries", async (req: Request, res: Response) => {
    const service: LocationService = new LocationService();

    const countries: Country[]| null = await service.getAllCountries();

    if(!countries) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching countries" });
    } else {
        res.status(StatusCodes.OK).json(countries);
    }
});