"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders/new", label: "New order", icon: PlusCircle },
  { href: "/orders/active", label: "Active", icon: ClipboardList },
  { href: "/inventory", label: "Stock", icon: Package },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();

  const linkClass = (href: string) =>
    cn(
      "flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-colors",
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <>
      <aside className="bg-card text-card-foreground fixed inset-y-0 left-0 z-40 hidden w-52 flex-col border-r border-border xl:flex">
        <div className="border-b border-border px-4 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            Mowa&apos;s Kitchenette
          </Link>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {data?.user?.email}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                pathname === href || (href !== "/" && pathname.startsWith(href))
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </Link>
          ))}
          <Link
            href="/products"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
              pathname.startsWith("/products")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <ShoppingBag className="size-5 shrink-0" />
            Products
          </Link>
          <Link
            href="/orders/history"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
              pathname.startsWith("/orders/history")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <ClipboardList className="size-5 shrink-0" />
            History
          </Link>
          <Link
            href="/reports/sales"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
              pathname.startsWith("/reports")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <ClipboardList className="size-5 shrink-0" />
            Sales
          </Link>
        </nav>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            className="h-12 w-full justify-start gap-3"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-5" />
            Sign out
          </Button>
        </div>
      </aside>

      <nav className="bg-card text-card-foreground fixed right-0 bottom-0 left-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)] xl:hidden">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon className="size-6" />
            <span>{label}</span>
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              "flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium text-muted-foreground outline-none",
            )}
          >
            <Menu className="size-6" />
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => router.push("/products")}>
              Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/orders/history")}>
              Order history
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reports/sales")}>
              Sales report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  );
}
