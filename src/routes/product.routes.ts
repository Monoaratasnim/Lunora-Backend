import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  listProductsHandler,
  updateProductHandler,
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const productRouter = Router();

productRouter.post("/", authenticate, requireRole(UserRole.ADMIN), createProductHandler);
productRouter.get("/", listProductsHandler);
productRouter.get("/:id", getProductByIdHandler);
productRouter.patch("/:id", authenticate, requireRole(UserRole.ADMIN), updateProductHandler);
productRouter.delete("/:id", authenticate, requireRole(UserRole.ADMIN), deleteProductHandler);

export { productRouter };
