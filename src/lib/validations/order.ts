import { OrderType } from "@/generated/prisma/browser";
import {
  addCalendarDaysToBusinessDate,
  getManilaBusinessDate,
  manilaBusinessDateFromYmd,
} from "@/lib/date";
import { z } from "zod";

const orderTypeZ = z.enum(OrderType);

export const MAX_ORDER_ADVANCE_DAYS = 30;

export const orderLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  notes: z.string().max(500).optional().nullable(),
});

export const createOrderSchema = z
  .object({
    type: orderTypeZ,
    customerName: z.string().max(120).optional().nullable(),
    customerNickname: z.string().max(120).optional().nullable(),
    queueNumber: z.coerce.number().int().min(1).max(9999).optional().nullable(),
    orderLabel: z.string().max(60).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    lines: z.array(orderLineSchema).min(1, "Add at least one item"),
    /** `YYYY-MM-DD` — which Manila day’s daily stock to reserve (today or advance). */
    stockDay: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : v),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.stockDay) return;
    let picked: Date;
    try {
      picked = manilaBusinessDateFromYmd(data.stockDay);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid stock day.",
        path: ["stockDay"],
      });
      return;
    }
    const today = getManilaBusinessDate();
    const latest = addCalendarDaysToBusinessDate(
      today,
      MAX_ORDER_ADVANCE_DAYS,
    );
    if (picked.getTime() < today.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Stock day cannot be in the past.",
        path: ["stockDay"],
      });
    }
    if (picked.getTime() > latest.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: `Advance orders are limited to ${MAX_ORDER_ADVANCE_DAYS} days ahead.`,
        path: ["stockDay"],
      });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderLineSchema = z.object({
  orderItemId: z.string().min(1).optional(),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  notes: z.string().max(500).optional().nullable(),
});

export const updateOrderItemsSchema = z
  .object({
    orderId: z.string().min(1),
    lines: z.array(updateOrderLineSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const line of data.lines) {
      if (line.orderItemId) {
        if (seen.has(line.orderItemId)) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate line id.",
            path: ["lines"],
          });
          return;
        }
        seen.add(line.orderItemId);
      }
    }
  });

export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;
