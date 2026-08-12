import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  deleteUserHandler,
  getUserByIdHandler,
  listUsersHandler,
  updateUserHandler,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/", requireRole(UserRole.ADMIN), listUsersHandler);
userRouter.get("/:id", getUserByIdHandler);
userRouter.patch("/:id", updateUserHandler);
userRouter.delete("/:id", requireRole(UserRole.ADMIN), deleteUserHandler);

export { userRouter };
