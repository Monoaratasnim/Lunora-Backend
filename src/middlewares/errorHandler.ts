import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { sendError } from "../utils/apiResponse.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.message);
    return;
  }

  console.error(err);
  sendError(res, 500, "Internal Server Error");
}
