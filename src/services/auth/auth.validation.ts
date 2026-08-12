import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters");

const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone must be at most 20 characters")
  .optional()
  .transform((value) => (value ? value : undefined));

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    phone: phoneSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
