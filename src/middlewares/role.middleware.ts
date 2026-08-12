import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../generated/prisma/enums.js";
import { ApiError } from "../utils/apiError.js";

export function requireRole(
  ...roles: readonly UserRole[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const authUser = req.user;
    if (!authUser) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    if (!roles.includes(authUser.role)) {
      next(new ApiError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
}
