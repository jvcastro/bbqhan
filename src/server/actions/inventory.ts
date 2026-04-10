"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-session";
import { getManilaBusinessDate } from "@/lib/date";
import {
  applyManualAdjustment,
  getOrCreateDailyInventory,
} from "@/lib/inventory-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const adjustSchema = z.object({
  productId: z.string(),
  delta: z.coerce.number().int().min(-9999).max(9999),
  note: z.string().max(200).optional(),
});

export async function listTodayInventory() {
  await requireUser();
  const businessDate = getManilaBusinessDate();

  const products = await prisma.product.findMany({
    where: { isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const rows = await prisma.dailyInventory.findMany({
    where: { businessDate },
    include: { product: true },
  });
  const byProduct = new Map(rows.map((r) => [r.productId, r]));

  return products.map((p) => {
    const inv = byProduct.get(p.id);
    return {
      product: p,
      daily: inv ?? null,
      businessDate,
    };
  });
}

export async function ensureTodayRow(productId: string) {
  const user = await requireUser();
  const businessDate = getManilaBusinessDate();
  await prisma.$transaction(async (tx) => {
    await getOrCreateDailyInventory(tx, productId, businessDate, user.id);
  });
  revalidatePath("/inventory");
}

export async function adjustTodayStock(raw: z.infer<typeof adjustSchema>) {
  const user = await requireUser();
  const data = adjustSchema.parse(raw);
  if (data.delta === 0) return;

  const businessDate = getManilaBusinessDate();

  await prisma.$transaction(async (tx) => {
    const inv = await getOrCreateDailyInventory(
      tx,
      data.productId,
      businessDate,
      user.id,
    );
    await applyManualAdjustment(tx, {
      dailyInventoryId: inv.id,
      delta: data.delta,
      note: data.note,
      userId: user.id,
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/orders/new");
}
