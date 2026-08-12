import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryByIdHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from "../controllers/category.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const categoryRouter = Router();

categoryRouter.post("/", authenticate, requireRole(UserRole.ADMIN), createCategoryHandler);
categoryRouter.get("/", listCategoriesHandler);
categoryRouter.get("/:id", getCategoryByIdHandler);
categoryRouter.patch("/:id", authenticate, requireRole(UserRole.ADMIN), updateCategoryHandler);
categoryRouter.delete("/:id", authenticate, requireRole(UserRole.ADMIN), deleteCategoryHandler);

export { categoryRouter };
