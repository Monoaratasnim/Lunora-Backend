import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../../generated/prisma/enums.js";
import { env } from "../lib/env.js";
import type { AuthUser, JwtPayload } from "../types/auth.types.js";
import { ApiError } from "../utils/apiError.js";

const ROLES: readonly string[] = [UserRole.ADMIN, UserRole.SELLER, UserRole.CUSTOMER];

function isJwtPayload(payload: unknown): payload is JwtPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.userId === "number" &&
    typeof candidate.role === "string" &&
    ROLES.includes(candidate.role)
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  let payload: JwtPayload;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (!isJwtPayload(decoded)) {
      next(new ApiError(401, "Invalid or expired token"));
      return;
    }
    payload = decoded;
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
    return;
  }

  const authUser: AuthUser = { userId: payload.userId, role: payload.role };
  req.user = authUser;
  next();
}
