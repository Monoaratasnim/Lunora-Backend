import { z } from "zod";
import { OrderStatus, PaymentStatus } from "../../../generated/prisma/enums.js";

const productIdSchema = z
  .number({ error: "Product id must be a number" })
  .int("Product id must be an integer")
  .positive("Product id must be a positive integer");

const quantitySchema = z
  .number({ error: "Quantity must be a number" })
  .int("Quantity must be an integer")
  .min(1, "Quantity must be at least 1")
  .max(100, "Quantity must be at most 100");

const itemsSchema = z
  .array(
    z
      .object({
        productId: productIdSchema,
        quantity: quantitySchema,
      })
      .strict()
  )
  .min(1, "At least one item is required")
  .max(50, "At most 50 items per order")
  .refine(
    (items) => new Set(items.map((item) => item.productId)).size === items.length,
    "Duplicate products in order items"
  );

const shippingAddressSchema = z
  .string()
  .trim()
  .min(1, "Shipping address must be at least 1 character")
  .max(200, "Shipping address must be at most 200 characters");

const shippingCitySchema = z
  .string()
  .trim()
  .min(1, "Shipping city must be at least 1 character")
  .max(100, "Shipping city must be at most 100 characters");

const shippingStateSchema = z
  .string()
  .trim()
  .min(1, "Shipping state must be at least 1 character")
  .max(100, "Shipping state must be at most 100 characters");

const shippingZipSchema = z
  .string()
  .trim()
  .min(1, "Shipping zip must be at least 1 character")
  .max(20, "Shipping zip must be at most 20 characters");

const shippingCountrySchema = z
  .string()
  .trim()
  .min(1, "Shipping country must be at least 1 character")
  .max(100, "Shipping country must be at most 100 characters");

export const createOrderSchema = z
  .object({
    items: itemsSchema,
    shippingAddress: shippingAddressSchema.optional(),
    shippingCity: shippingCitySchema.optional(),
    shippingState: shippingStateSchema.optional(),
    shippingZip: shippingZipSchema.optional(),
    shippingCountry: shippingCountrySchema.optional(),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: z.nativeEnum(OrderStatus),
  })
  .strict();

export const updatePaymentStatusSchema = z
  .object({
    paymentStatus: z.nativeEnum(PaymentStatus),
  })
  .strict();

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be a positive integer").max(100, "Limit must be at most 100").default(10),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  userId: z.coerce.number().int().positive("User id must be a positive integer").optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
