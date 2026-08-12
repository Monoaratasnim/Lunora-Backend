import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "../../../generated/prisma/client.js";
import type { User } from "../../../generated/prisma/client.js";
import { UserStatus } from "../../../generated/prisma/enums.js";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthUser, JwtPayload, LoginResult, RegisterResult, SafeUser } from "../../types/auth.types.js";
import { ApiError } from "../../utils/apiError.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

const BCRYPT_SALT_ROUNDS = 10;

function toSafeUser(user: User): SafeUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function generateToken(authUser: AuthUser): string {
  const payload: JwtPayload = { userId: authUser.userId, role: authUser.role };
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as NonNullable<jwt.SignOptions["expiresIn"]>,
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: passwordHash,
        phone: input.phone ?? null,
      },
    });

    const token = generateToken({ userId: user.id, role: user.role });
    return { user: toSafeUser(user), token };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, "Email already registered");
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = generateToken({ userId: user.id, role: user.role });
  return { user: toSafeUser(user), token };
}

export async function getUserById(userId: number): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return toSafeUser(user);
}
