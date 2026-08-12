import { Prisma } from "../../../generated/prisma/client.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./product.validation.js";

const safeProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  price: true,
  compareAtPrice: true,
  stockQuantity: true,
  images: true,
  isFeatured: true,
  categoryId: true,
  category: {
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
} as const satisfies Prisma.ProductSelect;

export interface SafeProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  stockQuantity: number;
  images: string[];
  isFeatured: boolean;
  categoryId: number;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  status: ProductStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListResult {
  products: SafeProduct[];
  pagination: ProductPagination;
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isForeignKeyError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target[0] as string | undefined;
  }
  return typeof target === "string" ? target : undefined;
}

function handleUniqueConflict(error: Prisma.PrismaClientKnownRequestError): never {
  const target = uniqueTarget(error);
  if (target === "slug") {
    throw new ApiError(409, "Product with this slug already exists");
  }
  if (target === "sku") {
    throw new ApiError(409, "Product with this sku already exists");
  }
  throw new ApiError(409, "Product with this slug or sku already exists");
}

export async function createProduct(input: CreateProductInput): Promise<SafeProduct> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId, isDeleted: false },
    select: { id: true },
  });

  if (!category) {
    throw new ApiError(400, "Category not found");
  }

  const existingSlug = await prisma.product.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new ApiError(409, "Product with this slug already exists");
  }

  const existingSku = await prisma.product.findUnique({
    where: { sku: input.sku },
    select: { id: true },
  });

  if (existingSku) {
    throw new ApiError(409, "Product with this sku already exists");
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description ?? null,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        stockQuantity: input.stockQuantity ?? 0,
        images: input.images ?? [],
        isFeatured: input.isFeatured ?? false,
        categoryId: input.categoryId,
        status: input.status ?? ProductStatus.ACTIVE,
        isDeleted: false,
      },
      select: safeProductSelect,
    });
    return product;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      handleUniqueConflict(error);
    }
    if (isForeignKeyError(error)) {
      throw new ApiError(400, "Category not found");
    }
    throw error;
  }
}

export async function listProducts(query: ListProductsQuery): Promise<ProductListResult> {
  const where: Prisma.ProductWhereInput = { isDeleted: false };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.categoryId !== undefined) {
    where.categoryId = query.categoryId;
  }
  if (query.status !== undefined) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: safeProductSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getProductById(id: number): Promise<SafeProduct> {
  const product = await prisma.product.findUnique({
    where: { id, isDeleted: false },
    select: safeProductSelect,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
}

export async function updateProduct(id: number, input: UpdateProductInput): Promise<SafeProduct> {
  if (input.categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId, isDeleted: false },
      select: { id: true },
    });

    if (!category) {
      throw new ApiError(400, "Category not found");
    }
  }

  if (input.slug !== undefined) {
    const existingSlug = await prisma.product.findFirst({
      where: { slug: input.slug, NOT: { id } },
      select: { id: true },
    });

    if (existingSlug) {
      throw new ApiError(409, "Product with this slug already exists");
    }
  }

  if (input.sku !== undefined) {
    const existingSku = await prisma.product.findFirst({
      where: { sku: input.sku, NOT: { id } },
      select: { id: true },
    });

    if (existingSku) {
      throw new ApiError(409, "Product with this sku already exists");
    }
  }

  const data: Prisma.ProductUncheckedUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.slug !== undefined) {
    data.slug = input.slug;
  }
  if (input.sku !== undefined) {
    data.sku = input.sku;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.price !== undefined) {
    data.price = input.price;
  }
  if (input.compareAtPrice !== undefined) {
    data.compareAtPrice = input.compareAtPrice;
  }
  if (input.stockQuantity !== undefined) {
    data.stockQuantity = input.stockQuantity;
  }
  if (input.images !== undefined) {
    data.images = input.images;
  }
  if (input.isFeatured !== undefined) {
    data.isFeatured = input.isFeatured;
  }
  if (input.categoryId !== undefined) {
    data.categoryId = input.categoryId;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  try {
    const product = await prisma.product.update({
      where: { id, isDeleted: false },
      data,
      select: safeProductSelect,
    });
    return product;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Product not found");
    }
    if (isUniqueConstraintError(error)) {
      handleUniqueConflict(error);
    }
    if (isForeignKeyError(error)) {
      throw new ApiError(400, "Category not found");
    }
    throw error;
  }
}

export async function deleteProduct(id: number): Promise<void> {
  try {
    await prisma.product.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Product not found");
    }
    throw error;
  }
}
