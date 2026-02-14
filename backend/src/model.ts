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
    ownerId: number
}

export type CompanyRow = {
    ID: number,
    NAME: string,
    OWNER_ID: number
}

export type Country = {
    countryCode: string,
    name: string
}

export type CountryRow = {
    COUNTRY_CODE: string,
    NAME: string
}