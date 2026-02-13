export class CompanyService {
    public async calculateNextPrice(companyCount: number): Promise<number> {
        if(companyCount == 1) return 0; // First company is free

        const basePrice = 10000; // Base price for the second company
        const growthFactor = 1.85; // Growth factor for subsequent companies

        return basePrice * Math.pow(growthFactor, companyCount - 2);
    }
}