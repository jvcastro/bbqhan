import Link from "next/link";
import type { Order, OrderItem, Product } from "@/generated/prisma/browser";
import {
  orderStatusLabels,
  orderTypeLabels,
  paymentLabels,
} from "@/lib/labels";
import {
  orderCustomerTitle,
  orderIsAdvanceStock,
  orderStockDayLabel,
} from "@/lib/order-display";
import { formatPhp } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderActions } from "@/components/orders/order-actions";

export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
};

const editableStatuses = new Set(["PENDING", "PREPARING", "READY"]);

export function OrderCard({ order }: { order: OrderWithItems }) {
  const total = order.items.reduce(
    (s, i) => s + i.quantity * i.unitPriceCents,
    0,
  );

  return (
    <Card>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="min-w-0 max-w-full break-words text-xl leading-tight font-semibold">
            {orderCustomerTitle(order)}
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {orderIsAdvanceStock(order) ? (
              <Badge variant="outline" className="border-amber-500/60 text-amber-950 dark:text-amber-100">
                Stock day {orderStockDayLabel(order)}
              </Badge>
            ) : null}
            <Badge variant="outline">{orderTypeLabels[order.type]}</Badge>
            <Badge
              variant={
                order.paymentStatus === "PAID" ? "default" : "secondary"
              }
            >
              {paymentLabels[order.paymentStatus]}
            </Badge>
            <Badge variant="secondary">{orderStatusLabels[order.status]}</Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm tabular-nums">
          Total {formatPhp(total)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-sm">
          {order.items.map((i) => (
            <li
              key={i.id}
              className="flex justify-between gap-2 border-b border-border py-1 last:border-0"
            >
              <span className="min-w-0 break-words">
                {i.quantity}× {i.product.name}
                {i.notes ? (
                  <span className="text-muted-foreground block text-xs">
                    {i.notes}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatPhp(i.quantity * i.unitPriceCents)}
              </span>
            </li>
          ))}
        </ul>
        {order.notes ? (
          <p className="text-muted-foreground text-sm">Note: {order.notes}</p>
        ) : null}
        {editableStatuses.has(order.status) ? (
          <Link
            href={`/orders/${order.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex w-full min-h-12 touch-manipulation items-center justify-center text-base",
            )}
          >
            Edit items
          </Link>
        ) : null}
        <OrderActions
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
        />
      </CardContent>
    </Card>
  );
}
