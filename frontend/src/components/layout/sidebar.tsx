"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  ArrowLeftRight,
  Tags,
  PieChart,
  Scale,
  Settings,
} from "lucide-react";

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navSections: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "INVESTMENTS",
    items: [
      { href: "/holdings", label: "Holdings", icon: TrendingUp },
      { href: "/fixed-deposits", label: "Fixed Deposits", icon: Landmark },
    ],
  },
  {
    label: "ACTIVITY",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "ORGANIZE",
    items: [
      { href: "/tags", label: "Tags", icon: Tags },
      { href: "/allocations", label: "Allocation Planning", icon: PieChart },
      { href: "/rebalancing", label: "Rebalancing", icon: Scale },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col overflow-y-auto border-r bg-gray-50">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Portfolio Tracker
        </h2>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-800"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto border-t pt-2">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
