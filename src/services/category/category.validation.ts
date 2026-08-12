import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required")
  .max(100, "Slug must be at most 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be at most 1000 characters")
  .nullable();

const imageUrlSchema = z.url("Invalid image URL").nullable();

export const createCategorySchema = z
  .object({
    name: nameSchema,
    slug: slugSchema,
    description: descriptionSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
  })
  .strict();

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be a positive integer").max(100, "Limit must be at most 100").default(10),
  search: z.string().trim().max(100, "Search must be at most 100 characters").optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
