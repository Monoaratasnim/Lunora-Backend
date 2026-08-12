import type { Response } from "express";

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void {
  const body: ApiResponse<T> = { success: true, message };

  if (data !== undefined) {
    body.data = data;
  }

  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string
): void {
  res.status(statusCode).json({ success: false, message } satisfies ApiResponse);
}
