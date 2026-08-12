import { Prisma } from "../../../generated/prisma/client.js";
import { UserStatus } from "../../../generated/prisma/enums.js";
import type { SafeUser } from "../../types/auth.types.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import type { ListUsersQuery, UpdateUserInput } from "./user.validation.js";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResult {
  users: SafeUser[];
  pagination: UserPagination;
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function listUsers(query: ListUsersQuery): Promise<UserListResult> {
  const where: Prisma.UserWhereInput = { isDeleted: false };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.role) {
    where.role = query.role;
  }
  if (query.status) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getUserById(id: number): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id, isDeleted: false },
    select: safeUserSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<SafeUser> {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl;
  }
  if (input.role !== undefined) {
    data.role = input.role;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  try {
    const user = await prisma.user.update({
      where: { id, isDeleted: false },
      data,
      select: safeUserSelect,
    });
    return user;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "User not found");
    }
    throw error;
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    await prisma.user.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true, status: UserStatus.INACTIVE },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "User not found");
    }
    throw error;
  }
}
