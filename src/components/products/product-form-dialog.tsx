"use client";

import { useState, useTransition } from "react";
import type { Product } from "@/generated/prisma/browser";
import { ProductCategory } from "@/generated/prisma/browser";
import { categoryLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createProduct,
  updateProduct,
} from "@/server/actions/products";
import { toast } from "sonner";

type Mode = "create" | "edit";

const categories = Object.values(ProductCategory);

function centsToPesoDisplay(cents: number) {
  return (cents / 100).toFixed(2);
}

function ProductFormInner({
  mode,
  product,
  onOpenChange,
}: {
  mode: Mode;
  product?: Product | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(
    () => (mode === "edit" && product ? product.name : ""),
  );
  const [category, setCategory] = useState<ProductCategory>(
    () =>
      mode === "edit" && product
        ? product.category
        : ProductCategory.GRILLED,
  );
  const [pricePhp, setPricePhp] = useState(() =>
    mode === "edit" && product
      ? centsToPesoDisplay(product.priceCents)
      : "25",
  );
  const [defaultDailyStock, setDefaultDailyStock] = useState(() =>
    mode === "edit" && product
      ? String(product.defaultDailyStock)
      : "80",
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(() =>
    mode === "edit" && product && product.lowStockThreshold != null
      ? String(product.lowStockThreshold)
      : "",
  );
  const [isAvailable, setIsAvailable] = useState(
    () => (mode === "edit" && product ? product.isAvailable : true),
  );
  const [sortOrder, setSortOrder] = useState(() =>
    mode === "edit" && product ? String(product.sortOrder) : "0",
  );

  function submit() {
    startTransition(async () => {
      try {
        const low =
          lowStockThreshold.trim() === ""
            ? null
            : parseInt(lowStockThreshold, 10);
        const payload = {
          name,
          category,
          pricePhp: parseFloat(pricePhp),
          defaultDailyStock: parseInt(defaultDailyStock, 10),
          lowStockThreshold: Number.isFinite(low) ? low : null,
          isAvailable,
          sortOrder: parseInt(sortOrder, 10) || 0,
        };
        if (mode === "create") {
          await createProduct(payload);
          toast.success("Product created");
        } else if (product) {
          await updateProduct(product.id, payload);
          toast.success("Product updated");
        }
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "New product" : "Edit product"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Name</Label>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ProductCategory)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-price">Price (PHP)</Label>
          <Input
            id="p-price"
            type="number"
            step="0.01"
            min={0}
            value={pricePhp}
            onChange={(e) => setPricePhp(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-def">Default daily stock</Label>
          <Input
            id="p-def"
            type="number"
            min={0}
            value={defaultDailyStock}
            onChange={(e) => setDefaultDailyStock(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-low">Low stock alert (optional)</Label>
          <Input
            id="p-low"
            type="number"
            min={0}
            placeholder="Use default (5) if empty"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-sort">Sort order</Label>
          <Input
            id="p-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="p-avail" className="text-base">
            Available for ordering
          </Label>
          <Switch
            id="p-avail"
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: Mode;
  product?: Product | null;
}) {
  const innerKey = `${mode}-${product?.id ?? "new"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {open ? (
          <ProductFormInner
            key={innerKey}
            mode={mode}
            product={product}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
