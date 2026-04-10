import Link from "next/link";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPhp } from "@/lib/money";
import { getTodayDashboard } from "@/server/actions/reports";
import { ClipboardList, Package, PlusCircle, ShoppingBag } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const dash = await getTodayDashboard();

  const tiles = [
    {
      href: "/orders/new",
      label: "New order",
      desc: "Fast take order",
      icon: PlusCircle,
    },
    {
      href: "/orders/active",
      label: "Active orders",
      desc: "Kitchen & pickup",
      icon: ClipboardList,
    },
    {
      href: "/inventory",
      label: "Today’s stock",
      desc: "Counts & adjustments",
      icon: Package,
    },
    {
      href: "/products",
      label: "Products",
      desc: "Menu & prices",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight xl:text-3xl">
          Hello{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm xl:text-base">
          Manila today — paid orders and revenue (cash-in).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue today</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatPhp(dash.revenueCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid orders</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {dash.paidOrderCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top seller (qty)</CardDescription>
            <CardTitle className="text-lg leading-tight">
              {dash.bestSellers[0]?.name ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {dash.bestSellers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Best sellers today</CardTitle>
            <CardDescription>By pieces sold (paid orders)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dash.bestSellers.slice(0, 5).map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{row.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.qty} pcs · {formatPhp(row.cents)}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/reports/sales"
              className="text-primary mt-2 inline-block text-sm font-medium underline-offset-4 hover:underline"
            >
              Full sales report
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full transition-colors hover:bg-muted/60">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <t.icon className="text-primary size-10 shrink-0" />
                <div>
                  <CardTitle className="text-lg">{t.label}</CardTitle>
                  <CardDescription>{t.desc}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
