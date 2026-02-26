export type User = {
    id: number,
    username: string,
    passwordHash: string
}

export type UserRow = {
    ID: number,
    USERNAME: string,
    PASSWORD_HASH: string
}

export type Company = {
    id: number,
    name: string,
    ownerId: number,
    businessTypeId: number
}

export type CompanyRow = {
    ID: number,
    NAME: string,
    OWNER_ID: number,
    BUSINESS_TYPE_ID: number,
    BUSINESS_TYPE_NAME: string
}

/**
 * type for frontend, including only fields that are being displayed in the frontend
 */
export type CompanyDTO = {
    id: number,
    name: string,
    businessType: string
}

export type Country = {
    countryCode: string,
    name: string
}

export type CountryRow = {
    COUNTRY_CODE: string,
    NAME: string
}

export type City = {
    name: string,
    countryCode: string
}

export type CityRow = {
    NAME: string,
    COUNTRY_CODE: string
}

export type BusinessType = {
    id: number,
    name: string
}

export type BusinessTypeRow = {
    ID: number,
    NAME: string
}

export type Product = {
    id: number,
    name: string,
    imgUrl: string,
    product_category: string,
    unit: string
}

export type ProductRow = {
    ID: number,
    NAME: string,
    IMG_URL: string,
    PRODUCT_CATEGORY: string,
    UNIT: string
}

export type InventoryItem = Product & {
    quantity: number,
    companyId: number
}

export type InventoryItemRow = ProductRow & {
    QUANTITY: number,
    COMPANY_ID: number
}

export type Warehouse = {
    id: number,
    companyId: number,
    name: string,
    latitude: number,
    longitude: number,
    country: string,
    city: string,
    capacity: number
}

export type WarehouseRow = {
    ID: number,
    COMPANY_ID: number
    NAME: string,
    LATITUDE: number,
    LONGITUDE: number,
    COUNTRY: string,
    CITY: string,
    CAPACITY_M3: number
}