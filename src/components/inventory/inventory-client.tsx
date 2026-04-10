"use client";

import { useState, useTransition } from "react";
import type { Product } from "@/generated/prisma/browser";
import { effectiveLowStockThreshold } from "@/lib/inventory-service";
import { formatPhp } from "@/lib/money";
import { categoryLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adjustTodayStock, ensureTodayRow } from "@/server/actions/inventory";
import { toast } from "sonner";

type Row = {
  product: Product;
  daily: {
    id: string;
    beginningStock: number;
    currentStock: number;
  } | null;
};

export function InventoryClient({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [deltaByProduct, setDeltaByProduct] = useState<Record<string, string>>(
    {},
  );
  const [noteByProduct, setNoteByProduct] = useState<Record<string, string>>(
    {},
  );

  function openDay(productId: string) {
    startTransition(async () => {
      try {
        await ensureTodayRow(productId);
        toast.success("Today’s row opened");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function adjust(productId: string) {
    const raw = deltaByProduct[productId] ?? "";
    const delta = parseInt(raw, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Enter a non-zero adjustment.");
      return;
    }
    startTransition(async () => {
      try {
        await adjustTodayStock({
          productId,
          delta,
          note: noteByProduct[productId]?.trim() || undefined,
        });
        toast.success("Stock updated");
        setDeltaByProduct((m) => ({ ...m, [productId]: "" }));
        setNoteByProduct((m) => ({ ...m, [productId]: "" }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Today&apos;s inventory
        </h1>
        <p className="text-muted-foreground text-sm">
          Remaining skewers after reservations and manual fixes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
          <CardDescription>
            Low stock uses each product&apos;s threshold, or 5 if unset.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Beginning</TableHead>
                  <TableHead className="text-right">Left</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead className="min-w-[200px]">Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ product, daily }) => {
                  const low = effectiveLowStockThreshold(product);
                  const lowFlag =
                    daily && daily.currentStock <= low ? true : false;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{categoryLabels[product.category]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {daily?.beginningStock ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {daily?.currentStock ?? "—"}
                      </TableCell>
                      <TableCell>
                        {lowFlag ? (
                          <Badge variant="destructive">Low</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">OK</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!daily ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => openDay(product.id)}
                          >
                            Open today
                          </Button>
                        ) : (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">+/− qty</Label>
                              <Input
                                className="h-9 w-20"
                                type="number"
                                value={deltaByProduct[product.id] ?? ""}
                                onChange={(e) =>
                                  setDeltaByProduct((m) => ({
                                    ...m,
                                    [product.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="min-w-[120px] flex-1 space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Input
                                className="h-9"
                                placeholder="optional"
                                value={noteByProduct[product.id] ?? ""}
                                onChange={(e) =>
                                  setNoteByProduct((m) => ({
                                    ...m,
                                    [product.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <Button
                              size="sm"
                              className="h-9"
                              disabled={pending}
                              onClick={() => adjust(product.id)}
                            >
                              Apply
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border xl:hidden">
            {rows.map(({ product, daily }) => {
              const low = effectiveLowStockThreshold(product);
              const lowFlag =
                daily && daily.currentStock <= low ? true : false;
              return (
                <li key={product.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {categoryLabels[product.category]} ·{" "}
                        {formatPhp(product.priceCents)}
                      </p>
                    </div>
                    {lowFlag ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Beginning</span>
                      <p className="text-lg font-semibold tabular-nums">
                        {daily?.beginningStock ?? "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Left</span>
                      <p className="text-lg font-semibold tabular-nums">
                        {daily?.currentStock ?? "—"}
                      </p>
                    </div>
                  </div>
                  {!daily ? (
                    <Button
                      className="h-11 w-full"
                      disabled={pending}
                      onClick={() => openDay(product.id)}
                    >
                      Open today&apos;s row
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">+/− qty</Label>
                          <Input
                            className="h-11"
                            type="number"
                            value={deltaByProduct[product.id] ?? ""}
                            onChange={(e) =>
                              setDeltaByProduct((m) => ({
                                ...m,
                                [product.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Note</Label>
                          <Input
                            className="h-11"
                            placeholder="optional"
                            value={noteByProduct[product.id] ?? ""}
                            onChange={(e) =>
                              setNoteByProduct((m) => ({
                                ...m,
                                [product.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Button
                        className="h-11 w-full"
                        disabled={pending}
                        onClick={() => adjust(product.id)}
                      >
                        Apply adjustment
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
