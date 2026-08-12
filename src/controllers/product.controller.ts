import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "../services/product/product.service.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
  type UpdateProductInput,
} from "../services/product/product.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const productIdSchema = z.coerce.number().int().positive();

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

function parseProductId(rawId: unknown): number {
  const result = productIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new ApiError(400, "Invalid product id");
  }
  return result.data;
}

export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await createProduct(input);
    sendSuccess(res, "Product created successfully", product, 201);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function listProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await listProducts(query);
    sendSuccess(res, "Products retrieved successfully", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function getProductByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProductId(req.params.id);
    const product = await getProductById(id);
    sendSuccess(res, "Product retrieved successfully", product);
  } catch (error) {
    next(error);
  }
}

export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProductId(req.params.id);
    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      throw new ApiError(400, "No update fields provided");
    }

    const input: UpdateProductInput = updateProductSchema.parse(body);
    const product = await updateProduct(id, input);
    sendSuccess(res, "Product updated successfully", product);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function deleteProductHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProductId(req.params.id);
    await deleteProduct(id);
    sendSuccess(res, "Product deleted successfully", null);
  } catch (error) {
    next(error);
  }
}
