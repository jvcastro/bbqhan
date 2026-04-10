import { HistoryFilters } from "@/components/orders/history-filters";
import { OrderCard } from "@/components/orders/order-card";
import { listOrderHistory } from "@/server/actions/orders";

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range === "week" ? "week" : "today";
  const orders = await listOrderHistory({
    range,
    search: sp.q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Order history
        </h1>
        <p className="text-muted-foreground text-sm">
          Recent tickets including completed and cancelled.
        </p>
      </div>
      <HistoryFilters />
      {orders.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No orders in this range.
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
