export const USER_TYPE = {
    USER: 0,
    DRIVER: 1,
};

export const CODE_CONTEXT = {
    ACTIVATION: 0,
    RESET_PASSWORD: 1,
};

export const ROLES = {
    PASSENGER: "passenger",
    DISPATCHER: "dispatcher",
    ADMIN: "admin",
    DRIVER: "driver",
};

export function mapUserAccountTypeToRole(accountType) {
    const numericType = Number(accountType);

    if (numericType === 2) return ROLES.DISPATCHER;
    if (numericType === 3) return ROLES.ADMIN;
    return ROLES.PASSENGER;
}
