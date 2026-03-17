import { Router } from "express";
import { getRouteListHandler } from "../controllers/routeController.js";

const router = Router();

router.get("/api/routes", getRouteListHandler);

export default router;
