import { z } from 'zod';
import { FULFILLMENT_TYPES, PAYMENT_METHODS } from '../enums';

/** A single line the customer wants. Prices are NEVER sent — the server re-prices (ADR-007). */
export const orderItemInputSchema = z
  .object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(50),
    optionIds: z.array(z.string().min(1)).max(20).default([]),
    notes: z.string().trim().max(200).optional(),
  })
  .strict();
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const placeOrderSchema = z
  .object({
    storeId: z.string().min(1),
    fulfillmentType: z.enum(FULFILLMENT_TYPES).default('DELIVERY'),
    addressId: z.string().min(1).optional(), // required for DELIVERY — checked server-side
    paymentMethod: z.enum(PAYMENT_METHODS).default('COD'),
    customerNotes: z.string().trim().max(300).optional(),
    items: z.array(orderItemInputSchema).min(1, 'السلة فاضية'),
    /** what the UI displayed — for drift detection only, never trusted as price */
    clientTotal: z.number().int().nonnegative(),
  })
  .strict();
export type PlaceOrderDto = z.infer<typeof placeOrderSchema>;

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().max(200).optional(),
  })
  .strict();
export type CancelOrderDto = z.infer<typeof cancelOrderSchema>;

export const reviewOrderSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  })
  .strict();
export type ReviewOrderDto = z.infer<typeof reviewOrderSchema>;
