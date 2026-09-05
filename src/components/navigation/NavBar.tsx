"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FaChevronDown,
  FaCog,
  FaFileInvoice,
  FaKey,
  FaUser,
} from "react-icons/fa";

import LogoutButton from "./LogoutButton";

type OpenMenu = "receipts" | "user" | null;

const receiptItems = [
  {
    label: "Receipt-7D",
    description: "Shopnoneer rent receipt",
    href: "/dashboard/rent-receipt-shopnoneer",
  },
  {
    label: "Receipt-M2",
    description: "M2 rent receipt",
    href: "/dashboard/rent-receipt-M2",
  },
];

const roleLabels = {
  superAdmin: "Super Admin",
  admin: "Admin / Owner",
  tenant: "Tenant",
  user: "General User",
};

const NavBar = () => {
  const pathname = usePathname();
  const navbarRef = useRef<HTMLElement>(null);

  const { user, isAuthLoading } = useAuth();

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const isReceiptActive = receiptItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const isDashboardActive =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/") && !isReceiptActive);

  const getDisplayName = () => {
    if (!user) {
      return "Account";
    }

    if (typeof user.name === "string") {
      return user.name;
    }

    if (user.name) {
      const fullName = [
        user.name.firstName,
        user.name.middleName,
        user.name.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        return fullName;
      }
    }

    return user.email.split("@")[0];
  };

  const displayName = getDisplayName();

  const roleLabel = user ? roleLabels[user.role] : "Not authenticated";

  const userInitial = displayName.charAt(0).toUpperCase();

  /*
   * Dropdown-এর বাইরে click করলে dropdown বন্ধ হবে।
   */
  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /*
   * "/" বর্তমানে login page।
   * সব hooks call হওয়ার পরে condition দেওয়া হয়েছে।
   */
  if (pathname === "/") {
    return null;
  }

  return (
    <header
      ref={navbarRef}
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/dashboard"
          onClick={() => setOpenMenu(null)}
          className="order-1 flex w-fit items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-emerald-600 text-lg font-bold text-white shadow-sm">
            A
          </div>

          <div>
            <h1 className="font-bold leading-tight text-slate-900">AHB</h1>

            <p className="text-xs text-slate-500">Receipt Management</p>
          </div>
        </Link>

        {/* Main navigation */}
        <nav className="order-3 flex w-full items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100/70 p-1 md:order-2 md:w-auto">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            onClick={() => setOpenMenu(null)}
            aria-current={isDashboardActive ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isDashboardActive
                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                : "text-slate-500 hover:bg-white hover:text-emerald-700"
            }`}
          >
            Dashboard
            {isDashboardActive && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-emerald-500" />
            )}
          </Link>

          {/* Receipts dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === "receipts"}
              onClick={() =>
                setOpenMenu((currentMenu) =>
                  currentMenu === "receipts" ? null : "receipts",
                )
              }
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isReceiptActive
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                  : "text-slate-500 hover:bg-white hover:text-emerald-700"
              }`}
            >
              Receipts
              <FaChevronDown
                className={`text-xs transition-transform duration-200 ${
                  openMenu === "receipts" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openMenu === "receipts" && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <div className="px-3 pb-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Receipt templates
                  </p>
                </div>

                {receiptItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <FaFileInvoice />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* User dropdown */}
        <div className="relative order-2 md:order-3">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === "user"}
            onClick={() =>
              setOpenMenu((currentMenu) =>
                currentMenu === "user" ? null : "user",
              )
            }
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-emerald-600 text-sm font-bold text-white">
              {isAuthLoading ? "..." : userInitial}
            </div>

            {/* Short user information */}
            <div className="hidden min-w-0 max-w-44 text-left sm:block">
              <p className="truncate text-sm font-semibold text-slate-800">
                {isAuthLoading ? "Loading account..." : displayName}
              </p>

              <p className="truncate text-xs text-slate-500">
                {isAuthLoading ? "Please wait" : roleLabel}
              </p>
            </div>

            <FaChevronDown
              className={`text-xs text-slate-400 transition-transform duration-200 ${
                openMenu === "user" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openMenu === "user" && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              {/* Full user information */}
              <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-emerald-600 text-lg font-bold text-white">
                    {userInitial}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                      {user?.email ?? "No user information"}
                    </p>
                  </div>
                </div>

                {user && (
                  <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {roleLabel}
                  </span>
                )}
              </div>

              {/* Future settings */}
              <div className="space-y-1 p-2">
                <button
                  type="button"
                  title="Profile URL will be added later"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  <FaUser className="text-slate-400" />

                  <div>
                    <p className="text-sm font-medium">My Profile</p>

                    <p className="text-xs text-slate-400">
                      Personal information
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  title="Settings URL will be added later"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  <FaCog className="text-slate-400" />

                  <div>
                    <p className="text-sm font-medium">Account Settings</p>

                    <p className="text-xs text-slate-400">
                      Account preferences
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  title="Password URL will be added later"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  <FaKey className="text-slate-400" />

                  <div>
                    <p className="text-sm font-medium">Change Password</p>

                    <p className="text-xs text-slate-400">
                      Password and security
                    </p>
                  </div>
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 p-2">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
