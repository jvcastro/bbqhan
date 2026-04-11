"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function HistoryFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const range = sp.get("range") ?? "today";

  function push(params: URLSearchParams) {
    const qs = params.toString();
    router.push(qs ? `/orders/history?${qs}` : "/orders/history");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <label className="text-sm font-medium" htmlFor="search-h">
          Search
        </label>
        <Input
          id="search-h"
          className="h-11 text-base"
          placeholder="Name, queue #, label, or order id"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const p = new URLSearchParams(sp.toString());
              const v = (e.target as HTMLInputElement).value.trim();
              if (v) p.set("q", v);
              else p.delete("q");
              push(p);
            }
          }}
        />
      </div>
      <div className="w-full space-y-2 sm:w-44">
        <span className="text-sm font-medium">Range</span>
        <Select
          value={range}
          onValueChange={(v) => {
            const p = new URLSearchParams(sp.toString());
            p.set("range", v ?? "today");
            push(p);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        className="h-11 w-full sm:w-auto"
        onClick={() => {
          const el = document.getElementById("search-h") as HTMLInputElement;
          const p = new URLSearchParams(sp.toString());
          const v = el?.value.trim() ?? "";
          if (v) p.set("q", v);
          else p.delete("q");
          push(p);
        }}
      >
        Search
      </Button>
    </div>
  );
}
