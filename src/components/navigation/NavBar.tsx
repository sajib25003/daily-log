"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Receipt-7D",
    href: "/dashboard/rent-receipt-shopnoneer",
  },
  {
    label: "Receipt-M2",
    href: "/dashboard/rent-receipt-M2",
  },
];

const NavBar = () => {
  const pathname = usePathname();

  const activeHref = navigationItems
    .filter(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-200  bg-white/90 shadow-sm backdrop-blur-md ${pathname === "/" ? "hidden" : ""}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex w-fit items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-emerald-600 text-lg font-bold text-white shadow-sm">
            A
          </div>

          <div>
            <h1 className="font-bold leading-tight text-slate-900">AHB</h1>
            <p className="text-xs text-slate-500">Receipt Management</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1  rounded-xl border border-slate-200/70 bg-slate-100/70 p-1">
          {navigationItems.map((item) => {
            const isActive = activeHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                    : "text-slate-500 hover:bg-white/80 hover:text-emerald-700"
                }`}
              >
                {item.label}

                {isActive && (
                  <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
