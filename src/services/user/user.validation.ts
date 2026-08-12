import { z } from "zod";
import { UserRole, UserStatus } from "../../../generated/prisma/enums.js";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone must be at most 20 characters")
  .regex(/^\+?[0-9][0-9\s().-]*$/, "Invalid phone number")
  .nullable();

const avatarUrlSchema = z.url("Invalid avatar URL").nullable();

export const adminUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    avatarUrl: avatarUrlSchema.optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .strict();

export const selfUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be a positive integer").max(100, "Limit must be at most 100").default(10),
  search: z.string().trim().max(100, "Search must be at most 100 characters").optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type UpdateUserInput = z.infer<typeof adminUpdateSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
