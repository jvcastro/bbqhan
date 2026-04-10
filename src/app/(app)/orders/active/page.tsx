import { OrderStatus } from "@/generated/prisma/browser";
import { ActiveOrdersFilters } from "@/components/orders/active-orders-filters";
import { OrderCard } from "@/components/orders/order-card";
import { listActiveOrders } from "@/server/actions/orders";

const activeSet = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
]);

export default async function ActiveOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  let status: OrderStatus | "ALL" = "ALL";
  if (sp.status && activeSet.has(sp.status as OrderStatus)) {
    status = sp.status as OrderStatus;
  }
  const orders = await listActiveOrders({
    status,
    search: sp.q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active orders</h1>
        <p className="text-muted-foreground text-sm">
          Pending, preparing, and ready — bump status as you go.
        </p>
      </div>
      <ActiveOrdersFilters />
      {orders.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No orders match. Start a{" "}
          <a href="/orders/new" className="text-primary underline">
            new order
          </a>
          .
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
