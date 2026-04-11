import type { Order } from "@/generated/prisma/browser";
import {
  formatManilaShortDate,
  formatManilaTime,
  getManilaBusinessDate,
} from "@/lib/date";

export type OrderCustomerFields = Pick<
  Order,
  | "id"
  | "createdAt"
  | "queueNumber"
  | "customerNickname"
  | "customerName"
  | "orderLabel"
  | "stockBusinessDate"
>;

export function orderCustomerTitle(o: OrderCustomerFields): string {
  const parts: string[] = [];
  if (o.queueNumber != null) parts.push(`#${o.queueNumber}`);
  if (o.customerNickname) parts.push(o.customerNickname);
  if (o.customerName) parts.push(o.customerName);
  if (o.orderLabel) parts.push(o.orderLabel);
  if (parts.length) return parts.join(" · ");
  const suffix = o.id.slice(-4).toUpperCase();
  return `Walk-in · ${formatManilaTime(o.createdAt)} · ${suffix}`;
}

export function orderIsAdvanceStock(o: OrderCustomerFields): boolean {
  return o.stockBusinessDate.getTime() > getManilaBusinessDate().getTime();
}

export function orderStockDayLabel(o: OrderCustomerFields): string {
  return formatManilaShortDate(o.stockBusinessDate);
}
