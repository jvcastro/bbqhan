"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/generated/prisma/browser";
import { OrderType, type ProductCategory } from "@/generated/prisma/browser";
import {
  addCalendarDaysToBusinessDate,
  formatManilaYmd,
  getManilaBusinessDate,
} from "@/lib/date";
import { categoryLabels, orderTypeLabels } from "@/lib/labels";
import { MAX_ORDER_ADVANCE_DAYS } from "@/lib/validations/order";
import { formatPhp } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrder } from "@/server/actions/orders";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const orderTypes = Object.values(OrderType);

function groupByCategory(products: Product[]) {
  const m = new Map<ProductCategory, Product[]>();
  for (const p of products) {
    if (!p.isAvailable) continue;
    const k = p.category;
    const arr = m.get(k) ?? [];
    arr.push(p);
    m.set(k, arr);
  }
  return m;
}

export function NewOrderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [stockDay, setStockDay] = useState(() => formatManilaYmd());
  const [customerName, setCustomerName] = useState("");
  const [customerNickname, setCustomerNickname] = useState("");
  const [queueNumber, setQueueNumber] = useState("");
  const [orderLabel, setOrderLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<
    Record<string, { qty: number; notes: string }>
  >({});

  const grouped = useMemo(() => groupByCategory(products), [products]);

  const maxStockYmd = useMemo(
    () =>
      formatManilaYmd(
        addCalendarDaysToBusinessDate(
          getManilaBusinessDate(),
          MAX_ORDER_ADVANCE_DAYS,
        ),
      ),
    [],
  );

  function bump(productId: string, delta: number) {
    setLines((prev) => {
      const cur = prev[productId] ?? { qty: 0, notes: "" };
      const nextQty = Math.max(0, cur.qty + delta);
      if (nextQty === 0) {
        const rest = { ...prev };
        delete rest[productId];
        return rest;
      }
      return { ...prev, [productId]: { ...cur, qty: nextQty } };
    });
  }

  const totalCents = useMemo(() => {
    let t = 0;
    for (const [pid, { qty }] of Object.entries(lines)) {
      const p = products.find((x) => x.id === pid);
      if (p) t += qty * p.priceCents;
    }
    return t;
  }, [lines, products]);

  function submit() {
    startTransition(async () => {
      try {
        const lineArr = Object.entries(lines)
          .filter(([, v]) => v.qty > 0)
          .map(([productId, v]) => ({
            productId,
            quantity: v.qty,
            notes: v.notes.trim() || null,
          }));
        await createOrder({
          type: orderType,
          stockDay,
          customerName: customerName.trim() || null,
          customerNickname: customerNickname.trim() || null,
          queueNumber:
            queueNumber.trim() === "" ? null : parseInt(queueNumber, 10),
          orderLabel: orderLabel.trim() || null,
          notes: notes.trim() || null,
          lines: lineArr,
        });
        toast.success("Order placed");
        router.push("/orders/active");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create order");
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 xl:flex-row xl:items-start xl:pb-6",
        /* Space below scroll area: order strip + offset for bottom nav + safe area */
        "max-xl:pb-[calc(11rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
          <p className="text-muted-foreground text-sm">
            Tap items to add. Customer fields are optional — counter tickets can
            stay blank and show as walk-in with time and a short id.
          </p>
        </div>

        <section className="space-y-2">
          <Label htmlFor="stock-day" className="text-base">
            Stock day (Manila)
          </Label>
          <p className="text-muted-foreground text-xs">
            Reserves from that day&apos;s inventory. Pick a future date for advance
            orders (up to {MAX_ORDER_ADVANCE_DAYS} days).
          </p>
          <Input
            id="stock-day"
            type="date"
            className="h-12 max-w-xs text-base"
            min={formatManilaYmd()}
            max={maxStockYmd}
            value={stockDay}
            onChange={(e) => setStockDay(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <Label className="text-base">Order type</Label>
          <div className="grid grid-cols-3 gap-2">
            {orderTypes.map((t) => (
              <Button
                key={t}
                type="button"
                variant={orderType === t ? "default" : "outline"}
                className="h-12 text-sm"
                onClick={() => setOrderType(t)}
              >
                {orderTypeLabels[t]}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Who it&apos;s for (optional)</h2>
          <p className="text-muted-foreground text-xs">
            Fill any of these if it helps the pass or kitchen; otherwise skip.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="q">Queue #</Label>
            <Input
              id="q"
              inputMode="numeric"
              className="h-12 text-lg"
              placeholder="e.g. 42"
              value={queueNumber}
              onChange={(e) => setQueueNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nick">Nickname</Label>
            <Input
              id="nick"
              className="h-12 text-lg"
              placeholder="e.g. Kuya Jun"
              value={customerNickname}
              onChange={(e) => setCustomerNickname(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className="h-12 text-lg"
              placeholder="optional"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Short label</Label>
            <Input
              id="label"
              className="h-12 text-lg"
              placeholder="e.g. Red cap"
              value={orderLabel}
              onChange={(e) => setOrderLabel(e.target.value)}
            />
          </div>
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="onotes">Order notes</Label>
          <Textarea
            id="onotes"
            className="min-h-[80px] text-base"
            placeholder="Allergies, extra sauce, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {[...grouped.entries()].map(([cat, plist]) => (
          <section key={cat} className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              {categoryLabels[cat]}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {plist.map((p) => {
                const line = lines[p.id];
                const qty = line?.qty ?? 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "bg-card flex flex-col gap-2 rounded-xl border border-border p-3 shadow-sm",
                      qty > 0 && "ring-primary ring-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {formatPhp(p.priceCents)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-11 shrink-0 touch-manipulation"
                          aria-label={`Less ${p.name}`}
                          onClick={() => bump(p.id, -1)}
                        >
                          <Minus className="size-5" />
                        </Button>
                        <span className="min-w-8 text-center text-lg font-semibold tabular-nums">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="default"
                          size="icon"
                          className="size-11 shrink-0 touch-manipulation"
                          aria-label={`More ${p.name}`}
                          onClick={() => bump(p.id, 1)}
                        >
                          <Plus className="size-5" />
                        </Button>
                      </div>
                    </div>
                    {qty > 0 ? (
                      <Input
                        className="h-9 text-sm"
                        placeholder="Item note (optional)"
                        value={line?.notes ?? ""}
                        onChange={(e) =>
                          setLines((prev) => ({
                            ...prev,
                            [p.id]: {
                              qty: prev[p.id]?.qty ?? qty,
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="bg-card xl:border-border xl:sticky xl:top-6 xl:w-72 xl:shrink-0 xl:rounded-xl xl:border xl:p-4">
        <div
          className={cn(
            "bg-background/95 supports-backdrop-filter:bg-background/80 z-30 border-border p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur xl:static xl:z-auto xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none",
            /* Above fixed bottom nav (min-h-12 row + nav safe-area padding) */
            "max-xl:fixed max-xl:inset-x-0 max-xl:bottom-[calc(0.25rem+3.5rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] max-xl:border-t max-xl:rounded-t-xl max-xl:pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          )}
        >
          <div className="mx-auto max-w-lg space-y-3 xl:mx-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPhp(totalCents)}
              </span>
            </div>
            <Button
              type="button"
              className="h-12 w-full text-base"
              disabled={pending || Object.keys(lines).length === 0}
              onClick={submit}
            >
              {pending ? "Saving…" : "Place order"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
