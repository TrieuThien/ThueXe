import { buildRolePath } from "../../config/roleRoutes";

export function buildStaffDetailPath(role, userId) {
    return buildRolePath(role, `staff/${userId}`);
}

export function buildStaffEditPath(role, userId) {
    return buildRolePath(role, `staff/${userId}/edit`);
}
