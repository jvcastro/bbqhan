"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-session";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/browser";
import type { Prisma } from "@/generated/prisma/client";
import {
  endOfManilaDayUtc,
  getManilaBusinessDate,
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
} from "@/lib/validations/order";

export async function createOrder(raw: CreateOrderInput) {
  const user = await requireUser();
  const parsed = createOrderSchema.parse(raw);
  const businessDate = getManilaBusinessDate();

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
    where.OR = [
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
    where.OR = [
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

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await requireUser();
  const businessDate = getManilaBusinessDate();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

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
