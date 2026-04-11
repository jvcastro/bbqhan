"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-session";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/browser";
import type { Prisma } from "@/generated/prisma/client";
import {
  endOfManilaDayUtc,
  getManilaBusinessDate,
  manilaBusinessDateFromYmd,
  startOfManilaDayUtc,
} from "@/lib/date";
import {
  releaseStockForOrder,
  reserveStockForOrder,
} from "@/lib/inventory-service";
import { prisma } from "@/lib/prisma";
import {
  createOrderSchema,
  type CreateOrderInput,
  updateOrderItemsSchema,
} from "@/lib/validations/order";

export async function createOrder(raw: CreateOrderInput) {
  const user = await requireUser();
  const parsed = createOrderSchema.parse(raw);
  const businessDate = parsed.stockDay
    ? manilaBusinessDateFromYmd(parsed.stockDay)
    : getManilaBusinessDate();

  const order = await prisma.$transaction(async (tx) => {
    const lineData: {
      productId: string;
      quantity: number;
      unitPriceCents: number;
      notes: string | null;
    }[] = [];

    for (const line of parsed.lines) {
      const product = await tx.product.findFirst({
        where: {
          id: line.productId,
          isArchived: false,
          isAvailable: true,
        },
      });
      if (!product) {
        throw new Error("One or more products are no longer available.");
      }
      lineData.push({
        productId: product.id,
        quantity: line.quantity,
        unitPriceCents: product.priceCents,
        notes: line.notes?.trim() || null,
      });
    }

    const created = await tx.order.create({
      data: {
        type: parsed.type,
        stockBusinessDate: businessDate,
        createdByUserId: user.id,
        customerName: parsed.customerName?.trim() || null,
        customerNickname: parsed.customerNickname?.trim() || null,
        queueNumber: parsed.queueNumber ?? null,
        orderLabel: parsed.orderLabel?.trim() || null,
        notes: parsed.notes?.trim() || null,
        items: {
          create: lineData.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            notes: l.notes,
          })),
        },
      },
      include: { items: true },
    });

    await reserveStockForOrder(tx, {
      orderId: created.id,
      businessDate,
      lines: created.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      userId: user.id,
    });

    return created;
  });

  revalidatePath("/orders/active");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/reports/sales");
  return order;
}

const activeStatuses: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

export async function listActiveOrders(filters?: {
  status?: OrderStatus | "ALL";
  search?: string;
}) {
  await requireUser();
  const search = filters?.search?.trim().toLowerCase();

  const where: Prisma.OrderWhereInput = {
    status:
      filters?.status && filters.status !== "ALL"
        ? filters.status
        : { in: activeStatuses },
  };

  if (search) {
    const queueNum = /^\d+$/.test(search) ? parseInt(search, 10) : NaN;
    const idMatch =
      search.length >= 4 ? { id: { contains: search } } : null;
    where.OR = [
      ...(idMatch ? [idMatch] : []),
      { customerName: { contains: search, mode: "insensitive" } },
      { customerNickname: { contains: search, mode: "insensitive" } },
      { orderLabel: { contains: search, mode: "insensitive" } },
      ...(Number.isFinite(queueNum)
        ? [{ queueNumber: { equals: queueNum } }]
        : []),
    ];
  }

  return prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
    },
    orderBy: [{ stockBusinessDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function listOrderHistory(filters?: {
  range?: "today" | "week";
  search?: string;
}) {
  await requireUser();
  const range = filters?.range ?? "today";
  const now = new Date();
  const start =
    range === "week"
      ? new Date(startOfManilaDayUtc(now).getTime() - 6 * 24 * 60 * 60 * 1000)
      : startOfManilaDayUtc(now);
  const end = endOfManilaDayUtc(now);

  const search = filters?.search?.trim().toLowerCase();

  const where: Prisma.OrderWhereInput = {
    createdAt: { gte: start, lte: end },
  };

  if (search) {
    const queueNum = /^\d+$/.test(search) ? parseInt(search, 10) : NaN;
    const idMatch =
      search.length >= 4 ? { id: { contains: search } } : null;
    where.OR = [
      ...(idMatch ? [idMatch] : []),
      { customerName: { contains: search, mode: "insensitive" } },
      { customerNickname: { contains: search, mode: "insensitive" } },
      { orderLabel: { contains: search, mode: "insensitive" } },
      ...(Number.isFinite(queueNum)
        ? [{ queueNumber: { equals: queueNum } }]
        : []),
    ];
  }

  return prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderForEdit(orderId: string) {
  await requireUser();
  return prisma.order.findFirst({
    where: {
      id: orderId,
      status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY] },
    },
    include: { items: { include: { product: true } } },
  });
}

export async function updateOrderItems(raw: unknown) {
  const user = await requireUser();
  const parsed = updateOrderItemsSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: parsed.orderId },
      include: { items: true },
    });

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PREPARING &&
      order.status !== OrderStatus.READY
    ) {
      throw new Error("Only pending, preparing, or ready orders can be edited.");
    }

    const stockDate = order.stockBusinessDate;
    const oldById = new Map(order.items.map((i) => [i.id, i]));

    const incomingIds = new Set(
      parsed.lines
        .map((l) => l.orderItemId)
        .filter((id): id is string => Boolean(id)),
    );

    for (const line of parsed.lines) {
      if (line.orderItemId) {
        const old = oldById.get(line.orderItemId);
        if (!old) {
          throw new Error("Unknown line item.");
        }
        if (old.productId !== line.productId) {
          throw new Error(
            "Cannot change product on an existing line. Remove the line and add the product again.",
          );
        }
      }
    }

    for (const item of order.items) {
      if (!incomingIds.has(item.id)) {
        await releaseStockForOrder(tx, {
          orderId: order.id,
          businessDate: stockDate,
          lines: [{ productId: item.productId, quantity: item.quantity }],
          userId: user.id,
        });
        await tx.orderItem.delete({ where: { id: item.id } });
      }
    }

    for (const line of parsed.lines) {
      if (!line.orderItemId) continue;
      const old = oldById.get(line.orderItemId);
      if (!old) {
        throw new Error("Line item no longer exists.");
      }

      const delta = line.quantity - old.quantity;
      if (delta > 0) {
        await reserveStockForOrder(tx, {
          orderId: order.id,
          businessDate: stockDate,
          lines: [{ productId: line.productId, quantity: delta }],
          userId: user.id,
        });
      } else if (delta < 0) {
        await releaseStockForOrder(tx, {
          orderId: order.id,
          businessDate: stockDate,
          lines: [{ productId: line.productId, quantity: -delta }],
          userId: user.id,
        });
      }
      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: {
          quantity: line.quantity,
          notes: line.notes?.trim() || null,
        },
      });
    }

    for (const line of parsed.lines) {
      if (line.orderItemId || line.quantity <= 0) continue;
      const product = await tx.product.findFirst({
        where: { id: line.productId, isArchived: false, isAvailable: true },
      });
      if (!product) {
        throw new Error("One or more products are no longer available.");
      }
      await reserveStockForOrder(tx, {
        orderId: order.id,
        businessDate: stockDate,
        lines: [{ productId: product.id, quantity: line.quantity }],
        userId: user.id,
      });
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: line.quantity,
          unitPriceCents: product.priceCents,
          notes: line.notes?.trim() || null,
        },
      });
    }
  });

  revalidatePath("/orders/active");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/reports/sales");
  revalidatePath(`/orders/${parsed.orderId}/edit`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const businessDate = order.stockBusinessDate;

    if (order.status === status) return;

    if (status === OrderStatus.CANCELLED) {
      if (order.status === OrderStatus.COMPLETED) {
        throw new Error("Cannot cancel a completed order.");
      }
      if (order.status !== OrderStatus.CANCELLED) {
        await releaseStockForOrder(tx, {
          orderId: order.id,
          businessDate,
          lines: order.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          userId: user.id,
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status },
    });
  });

  revalidatePath("/orders/active");
  revalidatePath("/orders/history");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/reports/sales");
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
) {
  await requireUser();

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : null,
    },
  });

  revalidatePath("/orders/active");
  revalidatePath("/orders/history");
  revalidatePath("/");
  revalidatePath("/reports/sales");
}
