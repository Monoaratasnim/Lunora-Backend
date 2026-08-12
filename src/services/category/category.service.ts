import { Prisma } from "../../../generated/prisma/client.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./category.validation.js";

const safeCategorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CategorySelect;

export interface SafeCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryListResult {
  categories: SafeCategory[];
  pagination: CategoryPagination;
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createCategory(input: CreateCategoryInput): Promise<SafeCategory> {
  const existingSlug = await prisma.category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new ApiError(409, "Category with this slug already exists");
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        isDeleted: false,
      },
      select: safeCategorySelect,
    });
    return category;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, "Category with this slug already exists");
    }
    throw error;
  }
}

export async function listCategories(query: ListCategoriesQuery): Promise<CategoryListResult> {
  const where: Prisma.CategoryWhereInput = { isDeleted: false };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      select: safeCategorySelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.category.count({ where }),
  ]);

  return {
    categories,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getCategoryById(id: number): Promise<SafeCategory & { productCount: number }> {
  const category = await prisma.category.findUnique({
    where: { id, isDeleted: false },
    select: {
      ...safeCategorySelect,
      _count: {
        select: {
          products: {
            where: { isDeleted: false, status: ProductStatus.ACTIVE },
          },
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const { _count, ...rest } = category;
  return { ...rest, productCount: _count.products };
}

export async function updateCategory(id: number, input: UpdateCategoryInput): Promise<SafeCategory> {
  if (input.slug !== undefined) {
    const existingSlug = await prisma.category.findFirst({
      where: { slug: input.slug, NOT: { id } },
      select: { id: true },
    });

    if (existingSlug) {
      throw new ApiError(409, "Category with this slug already exists");
    }
  }

  const data: Prisma.CategoryUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.slug !== undefined) {
    data.slug = input.slug;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.imageUrl !== undefined) {
    data.imageUrl = input.imageUrl;
  }

  try {
    const category = await prisma.category.update({
      where: { id, isDeleted: false },
      data,
      select: safeCategorySelect,
    });
    return category;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Category not found");
    }
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, "Category with this slug already exists");
    }
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      _count: {
        select: {
          products: {
            where: { isDeleted: false, status: ProductStatus.ACTIVE },
          },
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (category._count.products > 0) {
    throw new ApiError(409, "Category cannot be deleted while active products are assigned to it");
  }

  await prisma.category.update({
    where: { id, isDeleted: false },
    data: { isDeleted: true },
  });
}
