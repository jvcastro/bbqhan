"use server";

import { requireUser } from "@/lib/auth-session";
import { PaymentStatus } from "@/generated/prisma/browser";
import { endOfManilaDayUtc, startOfManilaDayUtc } from "@/lib/date";
import { prisma } from "@/lib/prisma";

/** Revenue uses orders paid today (Manila calendar day on `paidAt`), per plan. */
export async function getTodayDashboard() {
  await requireUser();
  const now = new Date();
  const start = startOfManilaDayUtc(now);
  const end = endOfManilaDayUtc(now);

  const paidOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { gte: start, lte: end },
    },
    include: { items: { include: { product: true } } },
  });

  let revenueCents = 0;
  const itemQty = new Map<string, { name: string; qty: number; cents: number }>();

  for (const o of paidOrders) {
    for (const line of o.items) {
      revenueCents += line.quantity * line.unitPriceCents;
      const name = line.product.name;
      const cur = itemQty.get(line.productId) ?? {
        name,
        qty: 0,
        cents: 0,
      };
      cur.qty += line.quantity;
      cur.cents += line.quantity * line.unitPriceCents;
      itemQty.set(line.productId, cur);
    }
  }

  const byItem = [...itemQty.values()].sort((a, b) => b.qty - a.qty);

  return {
    paidOrderCount: paidOrders.length,
    revenueCents,
    bestSellers: byItem.slice(0, 8),
  };
}

export async function getTodaySalesDetail() {
  await requireUser();
  const now = new Date();
  const start = startOfManilaDayUtc(now);
  const end = endOfManilaDayUtc(now);

  const paidOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { gte: start, lte: end },
    },
    include: { items: { include: { product: true } } },
    orderBy: { paidAt: "desc" },
  });

  const itemMap = new Map<
    string,
    { name: string; qty: number; revenueCents: number }
  >();

  let revenueCents = 0;
  for (const o of paidOrders) {
    for (const line of o.items) {
      const add = line.quantity * line.unitPriceCents;
      revenueCents += add;
      const cur = itemMap.get(line.productId) ?? {
        name: line.product.name,
        qty: 0,
        revenueCents: 0,
      };
      cur.qty += line.quantity;
      cur.revenueCents += add;
      itemMap.set(line.productId, cur);
    }
  }

  return {
    paidOrderCount: paidOrders.length,
    revenueCents,
    revenueByItem: [...itemMap.values()].sort(
      (a, b) => b.revenueCents - a.revenueCents,
    ),
    orders: paidOrders,
  };
}
