import { getRoutes as findAllRoutes } from "../repositories/routeRepository.js";

export async function getRoutes() {
    return findAllRoutes();
}
