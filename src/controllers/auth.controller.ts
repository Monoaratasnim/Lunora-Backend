import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { getUserById, loginUser, registerUser } from "../services/auth/auth.service.js";
import { loginSchema, registerSchema } from "../services/auth/auth.validation.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

function getZodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    sendSuccess(res, "Registration successful", result, 201);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    sendSuccess(res, "Login successful", result);
  } catch (error) {
    next(error instanceof ZodError ? new ApiError(400, getZodErrorMessage(error)) : error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (userId === undefined) {
      throw new ApiError(401, "Authentication required");
    }

    const user = await getUserById(userId);
    sendSuccess(res, "User retrieved successfully", user);
  } catch (error) {
    next(error);
  }
}
