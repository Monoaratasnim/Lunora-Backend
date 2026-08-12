import { Prisma } from "../../../generated/prisma/client.js";
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import type { AuthUser } from "../../types/auth.types.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
} from "./order.validation.js";

const safeOrderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
  status: true,
  paymentStatus: true,
  subtotal: true,
  tax: true,
  shippingFee: true,
  total: true,
  shippingAddress: true,
  shippingCity: true,
  shippingState: true,
  shippingZip: true,
  shippingCountry: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      status: true,
      isDeleted: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
        },
      },
    },
  },
} as const satisfies Prisma.OrderSelect;

export interface SafeOrderItem {
  id: number;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  status: OrderItemStatus;
  isDeleted: boolean;
  productId: number;
  product: {
    id: number;
    name: string;
    slug: string;
    images: string[];
  };
}

export interface SafeOrder {
  id: number;
  orderNumber: string;
  userId: number;
  user: {
    id: number;
    name: string;
  };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  total: Prisma.Decimal;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: SafeOrderItem[];
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderListResult {
  orders: SafeOrder[];
  pagination: OrderPagination;
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

async function ensureActiveUser(authUserId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: authUserId, isDeleted: false, status: UserStatus.ACTIVE },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }
}

export async function createOrder(input: CreateOrderInput, authUserId: number): Promise<SafeOrder> {
  await ensureActiveUser(authUserId);

  const order = await prisma.$transaction(async (tx) => {
    const productIds = input.items.map((item) => item.productId);

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        status: ProductStatus.ACTIVE,
      },
      select: { id: true, name: true, price: true, stockQuantity: true },
    });

    if (products.length !== productIds.length) {
      throw new ApiError(400, "One or more products not found");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(400, "Product not found");
      }
      if (product.stockQuantity < item.quantity) {
        throw new ApiError(409, `Insufficient stock for product "${product.name}"`);
      }
    }

    for (const item of input.items) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (result.count === 0) {
        const product = productMap.get(item.productId);
        throw new ApiError(409, `Insufficient stock for product "${product?.name ?? ""}"`);
      }
    }

    let subtotal = new Prisma.Decimal(0);
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      subtotal = subtotal.add(product!.price.mul(item.quantity));
    }

    return tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: authUserId,
        subtotal,
        tax: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        total: subtotal,
        shippingAddress: input.shippingAddress ?? null,
        shippingCity: input.shippingCity ?? null,
        shippingState: input.shippingState ?? null,
        shippingZip: input.shippingZip ?? null,
        shippingCountry: input.shippingCountry ?? null,
        isDeleted: false,
        items: {
          create: input.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              quantity: item.quantity,
              unitPrice: product.price,
              totalPrice: product.price.mul(item.quantity),
              productId: item.productId,
              status: OrderItemStatus.ACTIVE,
              isDeleted: false,
            };
          }),
        },
      },
      select: safeOrderSelect,
    });
  });

  return order;
}

export async function listOrders(query: ListOrdersQuery, authUser: AuthUser): Promise<OrderListResult> {
  const where: Prisma.OrderWhereInput = { isDeleted: false };

  if (authUser.role !== UserRole.ADMIN) {
    where.userId = authUser.userId;
  } else {
    if (query.userId !== undefined) {
      where.userId = query.userId;
    }
  }
  if (query.status !== undefined) {
    where.status = query.status;
  }
  if (query.paymentStatus !== undefined) {
    where.paymentStatus = query.paymentStatus;
  }

  const skip = (query.page - 1) * query.limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: safeOrderSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getOrderById(id: number, authUser: AuthUser): Promise<SafeOrder> {
  const order = await prisma.order.findUnique({
    where: { id, isDeleted: false },
    select: safeOrderSelect,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (authUser.role !== UserRole.ADMIN && order.userId !== authUser.userId) {
    throw new ApiError(403, "You can only access your own order");
  }

  return order;
}

export async function updateOrderStatus(id: number, input: UpdateOrderStatusInput): Promise<SafeOrder> {
  const existing = await prisma.order.findUnique({
    where: { id, isDeleted: false },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ApiError(404, "Order not found");
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[existing.status];
  if (!allowedTransitions.includes(input.status)) {
    throw new ApiError(400, `Invalid order status transition from ${existing.status} to ${input.status}`);
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status: input.status },
      select: safeOrderSelect,
    });
    return order;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Order not found");
    }
    throw error;
  }
}

export async function updatePaymentStatus(id: number, input: UpdatePaymentStatusInput): Promise<SafeOrder> {
  try {
    const order = await prisma.order.update({
      where: { id, isDeleted: false },
      data: { paymentStatus: input.paymentStatus },
      select: safeOrderSelect,
    });
    return order;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Order not found");
    }
    throw error;
  }
}

export async function cancelOrder(id: number, authUser: AuthUser): Promise<SafeOrder> {
  const order = await prisma.order.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      userId: true,
      status: true,
      items: {
        where: { isDeleted: false, status: OrderItemStatus.ACTIVE },
        select: { id: true, productId: true, quantity: true },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (authUser.role !== "ADMIN" && order.userId !== authUser.userId) {
    throw new ApiError(403, "You can only cancel your own order");
  }

  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
    throw new ApiError(400, "Only pending or processing orders can be cancelled");
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    if (order.items.length > 0) {
      await tx.orderItem.updateMany({
        where: { orderId: id, status: OrderItemStatus.ACTIVE },
        data: { status: OrderItemStatus.CANCELLED },
      });
    }

    return tx.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      select: safeOrderSelect,
    });
  });

  return cancelled;
}

export async function deleteOrder(id: number): Promise<void> {
  try {
    await prisma.order.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ApiError(404, "Order not found");
    }
    throw error;
  }
}
