"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { pesosToCents } from "@/lib/money";
import {
  productFormSchema,
  type ProductFormInput,
} from "@/lib/validations/product";

/** Full catalog including archived — staff can view; only admins edit. */
export async function listProductsCatalog() {
  await requireUser();
  return prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listProductsForOrders() {
  await requireUser();
  return prisma.product.findMany({
    where: { isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createProduct(raw: ProductFormInput) {
  await requireAdmin();
  const data = productFormSchema.parse(raw);
  await prisma.product.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      priceCents: pesosToCents(data.pricePhp),
      defaultDailyStock: data.defaultDailyStock,
      lowStockThreshold: data.lowStockThreshold ?? null,
      isAvailable: data.isAvailable,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/orders/new");
}

export async function updateProduct(
  id: string,
  raw: ProductFormInput,
) {
  await requireAdmin();
  const data = productFormSchema.parse(raw);
  await prisma.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      category: data.category,
      priceCents: pesosToCents(data.pricePhp),
      defaultDailyStock: data.defaultDailyStock,
      lowStockThreshold: data.lowStockThreshold ?? null,
      isAvailable: data.isAvailable,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/orders/new");
}

export async function setProductArchived(id: string, isArchived: boolean) {
  await requireAdmin();
  await prisma.product.update({
    where: { id },
    data: { isArchived },
  });
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/orders/new");
}
