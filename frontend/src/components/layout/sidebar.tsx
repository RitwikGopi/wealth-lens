"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  ArrowLeftRight,
  Tags,
  PieChart,
  Scale,
  Settings,
  Menu,
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

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
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
                onClick={onNavigate}
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
              onClick={onNavigate}
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
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col overflow-y-auto border-r bg-gray-50 md:flex">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Portfolio Tracker
          </h2>
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b bg-white px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="mr-3 p-1" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <div className="p-6">
              <SheetTitle className="text-lg font-semibold text-gray-900">
                Portfolio Tracker
              </SheetTitle>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-gray-900">
          Portfolio Tracker
        </span>
      </header>
    </>
  );
}
