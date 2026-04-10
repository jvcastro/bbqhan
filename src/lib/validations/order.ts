import { OrderType } from "@/generated/prisma/browser";
import { z } from "zod";

const orderTypeZ = z.enum(OrderType);

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
  })
  .refine(
    (d) =>
      Boolean(
        (d.customerName && d.customerName.trim()) ||
          (d.customerNickname && d.customerNickname.trim()) ||
          d.queueNumber != null ||
          (d.orderLabel && d.orderLabel.trim()),
      ),
    { message: "Add customer name, nickname, queue number, or label." },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
