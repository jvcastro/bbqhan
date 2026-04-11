"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatus } from "@/generated/prisma/browser";
import { orderStatusLabels } from "@/lib/labels";

const filterStatuses = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ActiveOrdersFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const status = sp.get("status") ?? "ALL";

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const nq = next.q !== undefined ? next.q : q;
    const ns = next.status !== undefined ? next.status : status;
    if (nq.trim()) params.set("q", nq.trim());
    if (ns && ns !== "ALL") params.set("status", ns);
    const qs = params.toString();
    router.push(qs ? `/orders/active?${qs}` : "/orders/active");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <label className="text-sm font-medium" htmlFor="search-o">
          Search
        </label>
        <Input
          id="search-o"
          className="h-11 text-base"
          placeholder="Name, queue #, label, or order id"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              apply({ q: (e.target as HTMLInputElement).value });
            }
          }}
        />
      </div>
      <div className="w-full space-y-2 sm:w-48">
        <span className="text-sm font-medium">Status</span>
        <Select
          value={status}
          onValueChange={(v) => apply({ status: v ?? "ALL" })}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All active</SelectItem>
            {filterStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {orderStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        className="h-11 w-full sm:w-auto"
        onClick={() => {
          const el = document.getElementById("search-o") as HTMLInputElement;
          apply({ q: el?.value ?? "" });
        }}
      >
        Search
      </Button>
    </div>
  );
}
