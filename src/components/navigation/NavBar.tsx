"use client";

import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
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
  admin: "System Admin",
  owner: "Property Owner",
  tenant: "Tenant",
  user: "General User",
} as const;

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

    const fullName = [
      user.name?.firstName,
      user.name?.middleName,
      user.name?.lastName,
    ]
      .filter(
        (namePart): namePart is string =>
          typeof namePart === "string" && namePart.trim().length > 0,
      )
      .map((namePart) => namePart.trim())
      .join(" ");

    if (fullName) {
      return fullName;
    }

    return user.email.split("@")[0] || "Account";
  };

  const displayName = getDisplayName();

  const roleLabel = user ? roleLabels[user.role] : "Not authenticated";

  const userInitial = displayName.charAt(0).toUpperCase() || "A";

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

  // Root route হচ্ছে login page
  if (pathname === "/") {
    return null;
  }

  return (
    <header
      ref={navbarRef}
      className="sticky top-0 z-50 border-b border-slate-700/60 bg-slate-950/90 shadow-xl shadow-black/10 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        {/* Brand */}
        <Link
          href="/dashboard"
          onClick={() => setOpenMenu(null)}
          className="order-1 flex shrink-0 items-center gap-3"
        >
          <div className="relative h-12 w-44 shrink-0 overflow-hidden rounded-xl border border-none  p-1 shadow-sm">
            <Image
              src="/logo.png"
              alt="AHB Logo"
              fill
              sizes="176px"
              priority
              unoptimized
              className="object-contain object-left brightness-0 invert"
            />
          </div>
        </Link>

        {/* Main navigation */}
        <nav className="order-3 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/80 p-1 md:order-2 md:w-auto">
          <Link
            href="/dashboard"
            onClick={() => setOpenMenu(null)}
            aria-current={isDashboardActive ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isDashboardActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            Dashboard
            {isDashboardActive && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-indigo-300" />
            )}
          </Link>

          {/* Receipt dropdown */}
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
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
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
                className="absolute left-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 p-2 shadow-2xl shadow-black/30"
              >
                <div className="px-3 pb-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                          ? "bg-indigo-500/15 text-indigo-300"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <FaFileInvoice />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.label}</p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
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
            aria-label="Open user menu"
            aria-haspopup="menu"
            aria-expanded={openMenu === "user"}
            onClick={() =>
              setOpenMenu((currentMenu) =>
                currentMenu === "user" ? null : "user",
              )
            }
            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-1.5 pr-3 transition hover:border-indigo-500/60 hover:bg-slate-800"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md">
              {isAuthLoading ? "..." : userInitial}
            </div>

            <div className="hidden min-w-0 max-w-44 text-left sm:block">
              <p className="truncate text-sm font-semibold text-slate-100">
                {isAuthLoading ? "Loading account..." : displayName}
              </p>

              <p className="truncate text-xs text-slate-500">
                {isAuthLoading ? "Please wait" : roleLabel}
              </p>
            </div>

            <FaChevronDown
              className={`text-xs text-slate-500 transition-transform duration-200 ${
                openMenu === "user" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openMenu === "user" && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-3 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/30"
            >
              {/* User information */}
              <div className="border-b border-slate-700/60 bg-slate-950/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md">
                    {userInitial}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-100">
                      {displayName}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                      {user && (
                        <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {roleLabel}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Future account settings */}
              <div className="space-y-1 p-2">
                <MenuButton
                  icon={<FaUser />}
                  label="My Profile"
                  description="Personal information"
                  title="Profile URL will be added later"
                />

                <MenuButton
                  icon={<FaCog />}
                  label="Account Settings"
                  description="Account preferences"
                  title="Settings URL will be added later"
                />

                <MenuButton
                  icon={<FaKey />}
                  label="Change Password"
                  description="Password and security"
                  title="Password URL will be added later"
                />
              </div>

              {/* Logout */}
              <div className="border-t border-slate-700/60 p-2">
                <LogoutButton onLogoutSuccess={() => setOpenMenu(null)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

type MenuButtonProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  title: string;
};

function MenuButton({ icon, label, description, title }: MenuButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      <span className="text-slate-500">{icon}</span>

      <span>
        <span className="block text-sm font-medium">{label}</span>

        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
}

export default NavBar;
