import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from "../services/category/category.service.js";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
  type UpdateCategoryInput,
} from "../services/category/category.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const categoryIdSchema = z.coerce.number().int().positive();

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

function parseCategoryId(rawId: unknown): number {
  const result = categoryIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new ApiError(400, "Invalid category id");
  }
  return result.data;
}

export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createCategorySchema.parse(req.body);
    const category = await createCategory(input);
    sendSuccess(res, "Category created successfully", category, 201);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listCategoriesQuerySchema.parse(req.query);
    const result = await listCategories(query);
    sendSuccess(res, "Categories retrieved successfully", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function getCategoryByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseCategoryId(req.params.id);
    const category = await getCategoryById(id);
    sendSuccess(res, "Category retrieved successfully", category);
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseCategoryId(req.params.id);
    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      throw new ApiError(400, "No update fields provided");
    }

    const input: UpdateCategoryInput = updateCategorySchema.parse(body);
    const category = await updateCategory(id, input);
    sendSuccess(res, "Category updated successfully", category);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function deleteCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseCategoryId(req.params.id);
    await deleteCategory(id);
    sendSuccess(res, "Category deleted successfully", null);
  } catch (error) {
    next(error);
  }
}
