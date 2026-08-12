import { z } from "zod";
import { ReviewStatus } from "../../../generated/prisma/enums.js";

const ratingSchema = z
  .number({ error: "Rating must be a number" })
  .int("Rating must be an integer")
  .min(1, "Rating must be at least 1")
  .max(5, "Rating must be at most 5");

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title must be at least 1 character")
  .max(120, "Title must be at most 120 characters")
  .nullable();

const commentSchema = z
  .string()
  .trim()
  .min(1, "Comment must be at least 1 character")
  .max(2000, "Comment must be at most 2000 characters")
  .nullable();

const productIdSchema = z
  .number({ error: "Product id must be a number" })
  .int("Product id must be an integer")
  .positive("Product id must be a positive integer");

export const createReviewSchema = z
  .object({
    rating: ratingSchema,
    title: titleSchema.optional(),
    comment: commentSchema.optional(),
    productId: productIdSchema,
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: ratingSchema.optional(),
    title: titleSchema.optional(),
    comment: commentSchema.optional(),
  })
  .strict();

export const updateReviewStatusSchema = z
  .object({
    status: z.nativeEnum(ReviewStatus),
  })
  .strict();

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be a positive integer").max(100, "Limit must be at most 100").default(10),
  productId: z.coerce.number().int().positive("Product id must be a positive integer").optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
