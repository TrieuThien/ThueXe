import { buildRolePath } from "../../config/roleRoutes";

export function buildVehicleOwnerDetailPath(role, ownerId) {
    return buildRolePath(role, `vehicle-owners/${ownerId}`);
}

export function buildVehicleOwnerEditPath(role, ownerId) {
    return buildRolePath(role, `vehicle-owners/${ownerId}/edit`);
}

