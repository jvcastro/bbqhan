"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Product } from "@/generated/prisma/browser";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderWithItems } from "@/components/orders/order-card";
import { orderStockDayLabel } from "@/lib/order-display";
import { formatPhp } from "@/lib/money";
import { updateOrderItems } from "@/server/actions/orders";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  orderItemId?: string;
  productId: string;
  productName: string;
  qty: number;
  notes: string;
};

function initRows(order: OrderWithItems): Row[] {
  return order.items.map((i) => ({
    key: i.id,
    orderItemId: i.id,
    productId: i.productId,
    productName: i.product.name,
    qty: i.quantity,
    notes: i.notes ?? "",
  }));
}

export function EditOrderForm({
  order,
  products,
}: {
  order: OrderWithItems;
  products: Product[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() => initRows(order));

  const priceById = useMemo(
    () => new Map(products.map((p) => [p.id, p.priceCents])),
    [products],
  );

  const pickable = useMemo(
    () => products.filter((p) => p.isAvailable && !p.isArchived),
    [products],
  );

  const totalCents = useMemo(() => {
    let t = 0;
    for (const r of rows) {
      if (r.qty <= 0) continue;
      const c = priceById.get(r.productId);
      if (c != null) t += r.qty * c;
    }
    return t;
  }, [rows, priceById]);

  function addProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p || !p.isAvailable || p.isArchived) return;
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: p.id,
        productName: p.name,
        qty: 1,
        notes: "",
      },
    ]);
  }

  function submit() {
    const lines = rows
      .filter((r) => r.qty > 0)
      .map((r) => ({
        orderItemId: r.orderItemId,
        productId: r.productId,
        quantity: r.qty,
        notes: r.notes.trim() || null,
      }));
    if (lines.length === 0) {
      toast.error("Keep at least one item with quantity 1 or more.");
      return;
    }
    startTransition(async () => {
      try {
        await updateOrderItems({ orderId: order.id, lines });
        toast.success("Order updated");
        router.push("/orders/active");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update order");
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 xl:flex-row xl:items-start xl:pb-6",
        "max-xl:pb-[calc(11rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit order</h1>
            <p className="text-muted-foreground text-sm">
              Stock day (fixed): {orderStockDayLabel(order)} — add or remove
              lines; inventory updates for that day.
            </p>
          </div>
          <Link
            href="/orders/active"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-10 touch-manipulation items-center justify-center px-3",
            )}
          >
            Back
          </Link>
        </div>

        <section className="space-y-2">
          <Label className="text-base">Add product</Label>
          <select
            className="border-input bg-background h-12 w-full max-w-md rounded-md border px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="Add product to order"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                addProduct(v);
                e.currentTarget.value = "";
              }
            }}
          >
            <option value="">Choose a product…</option>
            {pickable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Lines
          </h2>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.key}
                className="bg-card flex flex-col gap-3 rounded-xl border border-border p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium leading-tight">
                    {r.productName}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 shrink-0 touch-manipulation"
                      aria-label={`Less ${r.productName}`}
                      onClick={() =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.key === r.key
                              ? { ...x, qty: Math.max(0, x.qty - 1) }
                              : x,
                          ),
                        )
                      }
                    >
                      <Minus className="size-5" />
                    </Button>
                    <span className="min-w-8 text-center text-lg font-semibold tabular-nums">
                      {r.qty}
                    </span>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      className="size-11 shrink-0 touch-manipulation"
                      aria-label={`More ${r.productName}`}
                      onClick={() =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.key === r.key ? { ...x, qty: x.qty + 1 } : x,
                          ),
                        )
                      }
                    >
                      <Plus className="size-5" />
                    </Button>
                  </div>
                </div>
                <Input
                  className="h-9 text-sm"
                  placeholder="Item note (optional)"
                  value={r.notes}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) =>
                        x.key === r.key ? { ...x, notes: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive touch-manipulation"
                  onClick={() =>
                    setRows((prev) => prev.filter((x) => x.key !== r.key))
                  }
                >
                  Remove line
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="bg-card xl:border-border xl:sticky xl:top-6 xl:w-72 xl:shrink-0 xl:rounded-xl xl:border xl:p-4">
        <div
          className={cn(
            "bg-background/95 supports-backdrop-filter:bg-background/80 z-30 border-border p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur xl:static xl:z-auto xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none",
            "max-xl:fixed max-xl:inset-x-0 max-xl:bottom-[calc(0.25rem+3.5rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] max-xl:border-t max-xl:rounded-t-xl max-xl:pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          )}
        >
          <div className="mx-auto max-w-lg space-y-3 xl:mx-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm">New total</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPhp(totalCents)}
              </span>
            </div>
            <Button
              type="button"
              className="h-12 w-full text-base touch-manipulation"
              disabled={pending || rows.every((r) => r.qty <= 0)}
              onClick={submit}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
