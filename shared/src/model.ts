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
    businessTypeId: number,
    balance: number
}

export type CompanyRow = {
    ID: number,
    NAME: string,
    OWNERID: number,
    BUSINESS_TYPE_ID: number,
    BUSINESS_TYPE_NAME: string,
    BALANCE: number
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
    countryCode: string,
    latitude: number,
    longitude: number
}

export type CityRow = {
    NAME: string,
    COUNTRY_CODE: string,
    LATITUDE: number,
    LONGITUDE: number
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
    capacity: number;
    items: InventoryItem[]
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

export type WarehouseWithItemsRow = {
    W_ID: number;
    W_COMPANY_ID: number;
    W_NAME: string;
    W_CAPACITY: number;
    CITY: string;
    LATITUDE: number;
    LONGITUDE: number;
    COUNTRY: string;

    WI_ID: number | null;
    QUANTITY: number | null;

    P_ID: number | null;
    P_NAME: string | null;
    IMG_URL: string | null;
    UNIT: string | null;
    PRODUCT_CATEGORY: string | null;
}

export type Location = {
    id: number,
    name: string,
    latitude: number,
    longitude: number,
    cityName: string,
    countryCode: string
}
export type LocationRow = {
    ID: number,
    NAME: string,
    LATITUDE: number,
    LONGITUDE: number,
    CITY_NAME: string,
    COUNTRY_CODE: string
}

export type Wholesaler = {
    id: number,
    name: string,
    logoUrl: string,
    location: {
        latitude: number,
        longitude: number,
        cityName: string,
        countryName: string
    },
    products: WholesalerProduct[]
}

export type WholesalerRow = {
    W_ID: number,
    W_NAME: string,
    W_LOGO_URL: string,
    LATITUDE: number,
    LONGITUDE: number,
    CITY_NAME: string,
    COUNTRY_NAME: string,

    PRODUCT_ID: number,
    PRICE: number,
    STOCK_QUANTITY: number,
    ORDER_UNIT: number,
    MAX_ORDER_STACKS: number,

    P_NAME: string,
    IMG_URL: string,
    P_UNIT: string,
    P_CATEGORY: string,

    CATEGORY_IMG_URL: string
}

export type WholesalerProduct = Product & {
    price: number,
    stock_quantity: number,
    order_unit: number,
    max_order_stacks: number,
    category_img_url: string
}