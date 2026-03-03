import { Router, type Request, type Response } from "express";
import { LocationService } from "../services/locationService.js";
import type { City, Country, Location } from "@economysim/shared";
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

locationRouter.get("/cities", async (req: Request, res: Response) => {
    const service: LocationService = new LocationService();

    const cities: City[] | null = await service.getAllCities();

    if(!cities) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching cities` });
    } else {
        res.status(StatusCodes.OK).json(cities);
    }
});

locationRouter.get("/free", async (req: Request, res: Response) => {
    const service: LocationService = new LocationService();

    const freeLocations: Location[] | null = await service.getFreeLocations();

    if(!freeLocations) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Error fetching free locations` });
    } else {
        res.status(StatusCodes.OK).json(freeLocations);
    }
});