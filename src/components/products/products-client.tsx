"use client";

import { useState, useTransition } from "react";
import type { Product } from "@/generated/prisma/browser";
import { UserRole } from "@/generated/prisma/browser";
import { categoryLabels } from "@/lib/labels";
import { formatPhp } from "@/lib/money";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setProductArchived } from "@/server/actions/products";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

export function ProductsClient({
  products,
  role,
}: {
  products: Product[];
  role: UserRole;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Product | null>(null);
  const [pending, startTransition] = useTransition();
  const isAdmin = role === UserRole.ADMIN;

  function openCreate() {
    setDialogMode("create");
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setDialogMode("edit");
    setEditing(p);
    setDialogOpen(true);
  }

  function toggleArchive(p: Product) {
    startTransition(async () => {
      try {
        await setProductArchived(p.id, !p.isArchived);
        toast.success(p.isArchived ? "Product restored" : "Product archived");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm">
            Menu items, prices, and default daily stock.
          </p>
        </div>
        {isAdmin ? (
          <Button className="h-12 gap-2 text-base" onClick={openCreate}>
            <Plus className="size-5" />
            Add product
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>
            Archived items stay in history but won&apos;t show on new orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Def. stock</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin ? <TableHead className="w-[140px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{categoryLabels[p.category]}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPhp(p.priceCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.defaultDailyStock}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!p.isAvailable ? (
                          <Badge variant="secondary">Unavailable</Badge>
                        ) : null}
                        {p.isArchived ? (
                          <Badge variant="outline">Archived</Badge>
                        ) : null}
                        {p.isAvailable && !p.isArchived ? (
                          <Badge>Active</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9"
                          disabled={pending}
                          onClick={() => toggleArchive(p)}
                        >
                          {p.isArchived ? "Restore" : "Archive"}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border xl:hidden">
            {products.map((p) => (
              <li key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {categoryLabels[p.category]} ·{" "}
                      {formatPhp(p.priceCents)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {!p.isAvailable ? (
                        <Badge variant="secondary">Unavailable</Badge>
                      ) : null}
                      {p.isArchived ? (
                        <Badge variant="outline">Archived</Badge>
                      ) : null}
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleArchive(p)}
                      >
                        {p.isArchived ? "Restore" : "Archive"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin ? (
        <ProductFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          product={editing}
        />
      ) : null}
    </div>
  );
}
