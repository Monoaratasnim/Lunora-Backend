import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  updateReview,
  updateReviewStatus,
} from "../services/review/review.service.js";
import {
  createReviewSchema,
  listReviewsQuerySchema,
  updateReviewSchema,
  updateReviewStatusSchema,
  type UpdateReviewInput,
  type UpdateReviewStatusInput,
} from "../services/review/review.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const reviewIdSchema = z.coerce.number().int().positive();

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

function parseReviewId(rawId: unknown): number {
  const result = reviewIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new ApiError(400, "Invalid review id");
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

export async function createReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createReviewSchema.parse(req.body);
    const authUser = getAuthenticatedUser(req);
    const review = await createReview(input, authUser.userId);
    sendSuccess(res, "Review created successfully", review, 201);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function listReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listReviewsQuerySchema.parse(req.query);
    const result = await listReviews(query);
    sendSuccess(res, "Reviews retrieved successfully", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function getReviewByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseReviewId(req.params.id);
    const review = await getReviewById(id);
    sendSuccess(res, "Review retrieved successfully", review);
  } catch (error) {
    next(error);
  }
}

export async function updateReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseReviewId(req.params.id);
    const authUser = getAuthenticatedUser(req);
    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      throw new ApiError(400, "No update fields provided");
    }

    const input: UpdateReviewInput = updateReviewSchema.parse(body);
    const review = await updateReview(id, input, authUser);
    sendSuccess(res, "Review updated successfully", review);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function updateReviewStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseReviewId(req.params.id);
    const input: UpdateReviewStatusInput = updateReviewStatusSchema.parse(req.body);
    const review = await updateReviewStatus(id, input);
    sendSuccess(res, "Review status updated successfully", review);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function deleteReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseReviewId(req.params.id);
    const authUser = getAuthenticatedUser(req);
    await deleteReview(id, authUser);
    sendSuccess(res, "Review deleted successfully", null);
  } catch (error) {
    next(error);
  }
}
