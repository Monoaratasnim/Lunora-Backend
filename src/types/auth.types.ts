import type { User } from "../../generated/prisma/client.js";
import type { UserRole } from "../../generated/prisma/enums.js";

export interface JwtPayload {
  userId: number;
  role: UserRole;
}

export interface AuthUser {
  userId: number;
  role: UserRole;
}

export type SafeUser = Omit<User, "password">;

export interface RegisterResult {
  user: SafeUser;
  token: string;
}

export interface LoginResult {
  user: SafeUser;
  token: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
