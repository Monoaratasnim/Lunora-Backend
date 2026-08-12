import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from "../services/order/order.service.js";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  type UpdateOrderStatusInput,
  type UpdatePaymentStatusInput,
} from "../services/order/order.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const orderIdSchema = z.coerce.number().int().positive();

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

function parseOrderId(rawId: unknown): number {
  const result = orderIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new ApiError(400, "Invalid order id");
  }
  return result.data;
}

function getAuthenticatedUser(req: Request): { userId: number; role: UserRole } {
  const authUser = req.user;
  if (!authUser) {
    throw new ApiError(401, "Authentication required");
  }
  return authUser;
}

export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createOrderSchema.parse(req.body);
    const authUser = getAuthenticatedUser(req);
    const order = await createOrder(input, authUser.userId);
    sendSuccess(res, "Order created successfully", order, 201);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listOrdersQuerySchema.parse(req.query);
    const authUser = getAuthenticatedUser(req);
    const result = await listOrders(query, authUser);
    sendSuccess(res, "Orders retrieved successfully", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function getOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseOrderId(req.params.id);
    const authUser = getAuthenticatedUser(req);
    const order = await getOrderById(id, authUser);
    sendSuccess(res, "Order retrieved successfully", order);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseOrderId(req.params.id);
    const input: UpdateOrderStatusInput = updateOrderStatusSchema.parse(req.body);
    const order = await updateOrderStatus(id, input);
    sendSuccess(res, "Order status updated successfully", order);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function updatePaymentStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseOrderId(req.params.id);
    const input: UpdatePaymentStatusInput = updatePaymentStatusSchema.parse(req.body);
    const order = await updatePaymentStatus(id, input);
    sendSuccess(res, "Payment status updated successfully", order);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function cancelOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseOrderId(req.params.id);
    const authUser = getAuthenticatedUser(req);
    const order = await cancelOrder(id, authUser);
    sendSuccess(res, "Order cancelled successfully", order);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseOrderId(req.params.id);
    await deleteOrder(id);
    sendSuccess(res, "Order deleted successfully", null);
  } catch (error) {
    next(error);
  }
}
