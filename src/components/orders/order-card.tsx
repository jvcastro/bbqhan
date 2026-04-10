import type { Order, OrderItem, Product } from "@/generated/prisma/browser";
import {
  orderStatusLabels,
  orderTypeLabels,
  paymentLabels,
} from "@/lib/labels";
import { formatPhp } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
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

function displayName(o: OrderWithItems) {
  const parts: string[] = [];
  if (o.queueNumber != null) parts.push(`#${o.queueNumber}`);
  if (o.customerNickname) parts.push(o.customerNickname);
  if (o.customerName) parts.push(o.customerName);
  if (o.orderLabel) parts.push(o.orderLabel);
  return parts.length ? parts.join(" · ") : "No name";
}

export function OrderCard({ order }: { order: OrderWithItems }) {
  const total = order.items.reduce(
    (s, i) => s + i.quantity * i.unitPriceCents,
    0,
  );

  return (
    <Card>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-xl leading-tight font-semibold">
            {displayName(order)}
          </CardTitle>
          <div className="flex flex-wrap gap-1">
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
              <span>
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
        <OrderActions
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
        />
      </CardContent>
    </Card>
  );
}
