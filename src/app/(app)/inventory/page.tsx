import { InventoryClient } from "@/components/inventory/inventory-client";
import { listTodayInventory } from "@/server/actions/inventory";

export default async function InventoryPage() {
  const data = await listTodayInventory();
  const rows = data.map((d) => ({
    product: d.product,
    daily: d.daily
      ? {
          id: d.daily.id,
          beginningStock: d.daily.beginningStock,
          currentStock: d.daily.currentStock,
        }
      : null,
  }));
  return <InventoryClient rows={rows} />;
}
