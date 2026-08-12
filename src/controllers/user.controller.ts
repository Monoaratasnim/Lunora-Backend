import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "../services/user/user.service.js";
import {
  adminUpdateSchema,
  listUsersQuerySchema,
  selfUpdateSchema,
  type UpdateUserInput,
} from "../services/user/user.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const userIdSchema = z.coerce.number().int().positive();

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

function parseUserId(rawId: unknown): number {
  const result = userIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new ApiError(400, "Invalid user id");
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

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(query);
    sendSuccess(res, "Users retrieved successfully", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function getUserByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const authUser = getAuthenticatedUser(req);

    if (authUser.role !== UserRole.ADMIN && authUser.userId !== id) {
      throw new ApiError(403, "You can only access your own profile");
    }

    const user = await getUserById(id);
    sendSuccess(res, "User retrieved successfully", user);
  } catch (error) {
    next(error);
  }
}

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const authUser = getAuthenticatedUser(req);

    if (authUser.role !== UserRole.ADMIN && authUser.userId !== id) {
      throw new ApiError(403, "You can only update your own profile");
    }

    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      throw new ApiError(400, "No update fields provided");
    }

    const schema = authUser.role === UserRole.ADMIN ? adminUpdateSchema : selfUpdateSchema;
    const input: UpdateUserInput = schema.parse(body);
    const user = await updateUser(id, input);
    sendSuccess(res, "User updated successfully", user);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    await deleteUser(id);
    sendSuccess(res, "User deleted successfully", null);
  } catch (error) {
    next(error);
  }
}
