import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  cancelOrderHandler,
  createOrderHandler,
  deleteOrderHandler,
  getOrderByIdHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
  updatePaymentStatusHandler,
} from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const orderRouter = Router();

orderRouter.post("/", authenticate, createOrderHandler);
orderRouter.get("/", authenticate, listOrdersHandler);
orderRouter.get("/:id", authenticate, getOrderByIdHandler);
orderRouter.patch("/:id/status", authenticate, requireRole(UserRole.ADMIN), updateOrderStatusHandler);
orderRouter.patch("/:id/payment-status", authenticate, requireRole(UserRole.ADMIN), updatePaymentStatusHandler);
orderRouter.post("/:id/cancel", authenticate, cancelOrderHandler);
orderRouter.delete("/:id", authenticate, requireRole(UserRole.ADMIN), deleteOrderHandler);

export { orderRouter };
