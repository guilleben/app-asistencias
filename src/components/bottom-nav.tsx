"use client";

import {
  BarChart3,
  CalendarCheck,
  Home,
  Menu,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/asistencias", label: "Asistencias", icon: CalendarCheck },
  { href: "/pagos", label: "Pagos", icon: Wallet },
  { href: "/estadisticas", label: "Estats.", icon: BarChart3 },
  { href: "/mas", label: "Más", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-bar z-40 shrink-0 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-3xl grid-cols-5 px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-all duration-200",
                  active && "bg-primary/10",
                )}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-tight",
                  active && "font-semibold",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
