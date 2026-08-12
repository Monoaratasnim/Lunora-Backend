import { z } from "zod";
import { ProductStatus } from "../../../generated/prisma/enums.js";

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

const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "SKU is required")
  .max(50, "SKU must be at most 50 characters")
  .regex(
    /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
    "SKU must contain only uppercase letters, numbers, and hyphens"
  );

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be at most 1000 characters")
  .nullable();

const moneySchema = z
  .number({ error: "Price must be a number" })
  .positive("Price must be a positive number")
  .max(99_999_999.99, "Price must be at most 99999999.99")
  .refine(
    (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6,
    "Price must have at most 2 decimal places"
  );

const moneyNullableSchema = moneySchema.nullable();

const stockQuantitySchema = z
  .number({ error: "Stock quantity must be a number" })
  .int("Stock quantity must be an integer")
  .min(0, "Stock quantity must be at least 0")
  .max(1_000_000, "Stock quantity must be at most 1000000");

const imagesSchema = z.array(z.url("Invalid image URL")).max(10, "Images must be at most 10");

const isFeaturedSchema = z.boolean();

const categoryIdSchema = z
  .number({ error: "Category id must be a number" })
  .int("Category id must be an integer")
  .positive("Category id must be a positive integer");

const statusSchema = z.nativeEnum(ProductStatus);

export const createProductSchema = z
  .object({
    name: nameSchema,
    slug: slugSchema,
    sku: skuSchema,
    description: descriptionSchema.optional(),
    price: moneySchema,
    compareAtPrice: moneyNullableSchema.optional(),
    stockQuantity: stockQuantitySchema.optional(),
    images: imagesSchema.optional(),
    isFeatured: isFeaturedSchema.optional(),
    categoryId: categoryIdSchema,
    status: statusSchema.optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    sku: skuSchema.optional(),
    description: descriptionSchema.optional(),
    price: moneySchema.optional(),
    compareAtPrice: moneyNullableSchema.optional(),
    stockQuantity: stockQuantitySchema.optional(),
    images: imagesSchema.optional(),
    isFeatured: isFeaturedSchema.optional(),
    categoryId: categoryIdSchema.optional(),
    status: statusSchema.optional(),
  })
  .strict();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be a positive integer").max(100, "Limit must be at most 100").default(10),
  search: z.string().trim().max(100, "Search must be at most 100 characters").optional(),
  categoryId: z.coerce.number().int().positive("Category id must be a positive integer").optional(),
  status: statusSchema.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
