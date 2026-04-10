import { ProductCategory } from "@/generated/prisma/browser";
import { z } from "zod";

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  category: z.enum(ProductCategory),
  pricePhp: z.coerce.number().positive("Price must be positive"),
  defaultDailyStock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
