import { InventoryLogType } from "@/generated/prisma/browser";
import type { Prisma } from "@/generated/prisma/client";

export const DEFAULT_LOW_STOCK = 5;

export function effectiveLowStockThreshold(
  product: { lowStockThreshold: number | null },
): number {
  return product.lowStockThreshold ?? DEFAULT_LOW_STOCK;
}

/** Ensure a `DailyInventory` row exists for the product/date (lazy “open day”). */
export async function getOrCreateDailyInventory(
  tx: Prisma.TransactionClient,
  productId: string,
  businessDate: Date,
  userId: string | null,
) {
  const existing = await tx.dailyInventory.findUnique({
    where: {
      businessDate_productId: { businessDate, productId },
    },
  });
  if (existing) return existing;

  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const beginning = product.defaultDailyStock;
  const row = await tx.dailyInventory.create({
    data: {
      businessDate,
      productId,
      beginningStock: beginning,
      currentStock: beginning,
    },
  });
  await tx.inventoryLog.create({
    data: {
      dailyInventoryId: row.id,
      type: InventoryLogType.OPENING,
      quantityDelta: beginning,
      note: "Opened from product default daily stock",
      userId: userId ?? undefined,
    },
  });
  return row;
}

export async function applyManualAdjustment(
  tx: Prisma.TransactionClient,
  params: {
    dailyInventoryId: string;
    delta: number;
    note?: string;
    userId: string;
  },
) {
  if (params.delta === 0) return;
  const row = await tx.dailyInventory.update({
    where: { id: params.dailyInventoryId },
    data: { currentStock: { increment: params.delta } },
  });
  if (row.currentStock < 0) {
    throw new Error("Stock cannot go below zero.");
  }
  await tx.inventoryLog.create({
    data: {
      dailyInventoryId: params.dailyInventoryId,
      type:
        params.delta > 0
          ? InventoryLogType.MANUAL_ADD
          : InventoryLogType.MANUAL_REMOVE,
      quantityDelta: params.delta,
      note: params.note,
      userId: params.userId,
    },
  });
}

export async function reserveStockForOrder(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    businessDate: Date;
    lines: { productId: string; quantity: number }[];
    userId: string;
  },
) {
  for (const line of params.lines) {
    if (line.quantity <= 0) continue;
    const inv = await getOrCreateDailyInventory(
      tx,
      line.productId,
      params.businessDate,
      params.userId,
    );
    if (inv.currentStock < line.quantity) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: line.productId },
      });
      throw new Error(
        `Not enough stock for ${product.name} (need ${line.quantity}, have ${inv.currentStock}).`,
      );
    }
    await tx.dailyInventory.update({
      where: { id: inv.id },
      data: { currentStock: { decrement: line.quantity } },
    });
    await tx.inventoryLog.create({
      data: {
        dailyInventoryId: inv.id,
        type: InventoryLogType.ORDER_RESERVE,
        quantityDelta: -line.quantity,
        orderId: params.orderId,
        userId: params.userId,
      },
    });
  }
}

export async function releaseStockForOrder(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    businessDate: Date;
    lines: { productId: string; quantity: number }[];
    userId: string;
  },
) {
  for (const line of params.lines) {
    if (line.quantity <= 0) continue;
    const inv = await tx.dailyInventory.findUnique({
      where: {
        businessDate_productId: {
          businessDate: params.businessDate,
          productId: line.productId,
        },
      },
    });
    if (!inv) continue;
    await tx.dailyInventory.update({
      where: { id: inv.id },
      data: { currentStock: { increment: line.quantity } },
    });
    await tx.inventoryLog.create({
      data: {
        dailyInventoryId: inv.id,
        type: InventoryLogType.ORDER_RELEASE,
        quantityDelta: line.quantity,
        orderId: params.orderId,
        userId: params.userId,
      },
    });
  }
}
