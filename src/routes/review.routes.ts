import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createReviewHandler,
  deleteReviewHandler,
  getReviewByIdHandler,
  listReviewsHandler,
  updateReviewHandler,
  updateReviewStatusHandler,
} from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const reviewRouter = Router();

reviewRouter.post("/", authenticate, createReviewHandler);
reviewRouter.get("/", listReviewsHandler);
reviewRouter.get("/:id", getReviewByIdHandler);
reviewRouter.patch("/:id", authenticate, updateReviewHandler);
reviewRouter.patch("/:id/status", authenticate, requireRole(UserRole.ADMIN), updateReviewStatusHandler);
reviewRouter.delete("/:id", authenticate, deleteReviewHandler);

export { reviewRouter };
