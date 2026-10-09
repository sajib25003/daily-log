"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FaBolt,
  FaBookOpen,
  FaBuilding,
  FaFileInvoiceDollar,
  FaHome,
  FaReceipt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

type AllowedRole = "superAdmin" | "owner" | "tenant";

type NavigationItem = {
  id: string;
  label: string;
  ownerLabel: string;
  href: string;
  icon: IconType;
  roles: AllowedRole[];
};

const MANAGEMENT_ROLES: AllowedRole[] = ["superAdmin", "owner"];
const TENANT_ROLES: AllowedRole[] = ["tenant"];

const navigationItems: NavigationItem[] = [
  {
    id: "users",
    label: "All Users",
    ownerLabel: "My Tenants",
    href: "/dashboard/users",
    icon: FaUsers,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "create-user",
    label: "Create User",
    ownerLabel: "Create Tenant",
    href: "/dashboard/users/create",
    icon: FaUserPlus,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "properties",
    label: "Properties & Apartments",
    ownerLabel: "My Properties & Apartments",
    href: "/dashboard/properties",
    icon: FaBuilding,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "rent-bills",
    label: "Rent Bills",
    ownerLabel: "Rent Bills",
    href: "/dashboard/rent-bills",
    icon: FaFileInvoiceDollar,
    roles: ["superAdmin", "owner", "tenant"],
  },
  {
    id: "property-ledger",
    label: "Property Ledger",
    ownerLabel: "Property Ledger",
    href: "/dashboard/property-ledger",
    icon: FaBookOpen,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "rent-settings",
    label: "Rent Settings",
    ownerLabel: "Rent Settings",
    href: "/dashboard/rent-settings",
    icon: FaReceipt,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "electricity",
    label: "Electricity",
    ownerLabel: "Electricity",
    href: "/dashboard/electricity",
    icon: FaBolt,
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "my-apartment",
    label: "My Apartment",
    ownerLabel: "My Apartment",
    href: "/dashboard/my-apartment",
    icon: FaHome,
    roles: TENANT_ROLES,
  },
];

const UserNavbar = () => {
  const { user, isAuthLoading } = useAuth();
  const pathname = usePathname();

  if (isAuthLoading) {
    return (
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!user || !["superAdmin", "owner", "tenant"].includes(user.role)) {
    return null;
  }

  const currentRole = user.role as AllowedRole;

  const availableItems = navigationItems.filter((item) =>
    item.roles.includes(currentRole),
  );

  /*
   * /dashboard/users/create route একই সঙ্গে /dashboard/users-এরও child।
   * তাই সবচেয়ে specific/longest matching route-কেই active ধরা হচ্ছে।
   */
  const activeHref = availableItems
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Management navigation"
      className="relative z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
        <span className="mr-1 hidden shrink-0 text-xs font-medium uppercase tracking-wider text-slate-500 md:block">
          {currentRole === "superAdmin"
            ? "Management"
            : currentRole === "owner"
              ? "My Management"
              : "My Home"}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {availableItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeHref === item.href;
            const itemLabel =
              currentRole === "owner" ? item.ownerLabel : item.label;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  isActive
                    ? "bg-slate-800 text-emerald-300 ring-1 ring-inset ring-emerald-500/20"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <ItemIcon className="text-sm" aria-hidden="true" />
                <span>{itemLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default UserNavbar;
