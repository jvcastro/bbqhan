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
import { formatPhp } from "@/lib/money";
import {
  orderStatusLabels,
  orderTypeLabels,
  paymentLabels,
} from "@/lib/labels";
import { getTodaySalesDetail } from "@/server/actions/reports";

export default async function SalesReportPage() {
  const data = await getTodaySalesDetail();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Sales report
        </h1>
        <p className="text-muted-foreground text-sm">
          Paid orders today (Manila) — matches dashboard revenue.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(data.revenueCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid orders</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.paidOrderCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by item</CardTitle>
          <CardDescription>From line items on paid orders</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueByItem.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.qty}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPhp(row.revenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paid orders (detail)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.orders.map((o) => {
            const sub = o.items.reduce(
              (s, i) => s + i.quantity * i.unitPriceCents,
              0,
            );
            return (
              <div
                key={o.id}
                className="bg-muted/40 space-y-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {o.queueNumber != null ? `#${o.queueNumber} · ` : null}
                    {o.customerNickname ?? o.customerName ?? o.orderLabel ?? "—"}
                  </span>
                  <span className="tabular-nums">{formatPhp(sub)}</span>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                  <span>{orderTypeLabels[o.type]}</span>
                  <span>·</span>
                  <span>{orderStatusLabels[o.status]}</span>
                  <span>·</span>
                  <span>{paymentLabels[o.paymentStatus]}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
