import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  ProductCategory,
} from "@/generated/prisma/browser";

export const orderTypeLabels: Record<OrderType, string> = {
  [OrderType.DINE_IN]: "Dine-in",
  [OrderType.TAKEOUT]: "Takeout",
  [OrderType.PICKUP]: "Pickup",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Pending",
  [OrderStatus.PREPARING]: "Preparing",
  [OrderStatus.READY]: "Ready",
  [OrderStatus.COMPLETED]: "Done",
  [OrderStatus.CANCELLED]: "Cancelled",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: "Unpaid",
  [PaymentStatus.PAID]: "Paid",
};

export const categoryLabels: Record<ProductCategory, string> = {
  [ProductCategory.GRILLED]: "Grilled",
  [ProductCategory.INNARDS]: "Innards",
  [ProductCategory.SNACKS]: "Snacks",
  [ProductCategory.DRINKS]: "Drinks",
  [ProductCategory.OTHER]: "Other",
};
