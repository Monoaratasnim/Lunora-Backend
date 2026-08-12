import { Prisma } from "../../../generated/prisma/client.js";
import { ReviewStatus, UserRole, UserStatus } from "../../../generated/prisma/enums.js";
import type { AuthUser } from "../../types/auth.types.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import type {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
  UpdateReviewStatusInput,
} from "./review.validation.js";

const safeReviewSelect = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  status: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.ReviewSelect;

export interface SafeReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  userId: number;
  user: {
    id: number;
    name: string;
  };
  productId: number;
  product: {
    id: number;
    name: string;
    slug: string;
  };
  status: ReviewStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReviewListResult {
  reviews: SafeReview[];
  pagination: ReviewPagination;
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createReview(input: CreateReviewInput, authUserId: number): Promise<SafeReview> {
  const user = await prisma.user.findUnique({
    where: { id: authUserId, isDeleted: false, status: UserStatus.ACTIVE },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId, isDeleted: false },
    select: { id: true },
  });

  if (!product) {
    throw new ApiError(400, "Product not found");
  }

  const existingReview = await prisma.review.findUnique({
    where: { userId_productId: { userId: authUserId, productId: input.productId } },
    select: { id: true },
  });

  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this product");
  }

  try {
    const review = await prisma.review.create({
      data: {
        rating: input.rating,
        title: input.title ?? null,
        comment: input.comment ?? null,
        userId: authUserId,
        productId: input.productId,
        status: ReviewStatus.PENDING,
        isDeleted: false,
      },
      select: safeReviewSelect,
    });
    return review;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, "You have already reviewed this product");
    }
    throw error;
  }
}

export async function listReviews(query: ListReviewsQuery): Promise<ReviewListResult> {
  const where: Prisma.ReviewWhereInput = { isDeleted: false };

  if (query.productId !== undefined) {
    where.productId = query.productId;
  }
  if (query.status !== undefined) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: safeReviewSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getReviewById(id: number): Promise<SafeReview> {
  const review = await prisma.review.findUnique({
    where: { id, isDeleted: false },
    select: safeReviewSelect,
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  return review;
}

export async function updateReview(id: number, input: UpdateReviewInput, authUser: AuthUser): Promise<SafeReview> {
  const review = await prisma.review.findUnique({
    where: { id, isDeleted: false },
    select: { id: true, userId: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (authUser.role !== UserRole.ADMIN && authUser.userId !== review.userId) {
    throw new ApiError(403, "You can only update your own review");
  }

  const data: Prisma.ReviewUpdateInput = {};

  if (input.rating !== undefined) {
    data.rating = input.rating;
  }
  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.comment !== undefined) {
    data.comment = input.comment;
  }

  try {
    const updated = await prisma.review.update({
      where: { id },
      data,
      select: safeReviewSelect,
    });
    return updated;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Review not found");
    }
    throw error;
  }
}

export async function updateReviewStatus(id: number, input: UpdateReviewStatusInput): Promise<SafeReview> {
  try {
    const review = await prisma.review.update({
      where: { id, isDeleted: false },
      data: { status: input.status },
      select: safeReviewSelect,
    });
    return review;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Review not found");
    }
    throw error;
  }
}

export async function deleteReview(id: number, authUser: AuthUser): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id, isDeleted: false },
    select: { id: true, userId: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (authUser.role !== UserRole.ADMIN && authUser.userId !== review.userId) {
    throw new ApiError(403, "You can only delete your own review");
  }

  try {
    await prisma.review.update({
      where: { id },
      data: { isDeleted: true },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Review not found");
    }
    throw error;
  }
}
