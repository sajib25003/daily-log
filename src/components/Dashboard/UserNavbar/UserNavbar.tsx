"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { FaBuilding, FaCheck, FaChevronDown, FaUsers } from "react-icons/fa";

type AllowedRole = "superAdmin" | "owner";
type MenuGroupId = "users" | "rent";

export type DashboardSection = "create-user" | "properties";

type MenuItem = {
  id: string;
  label: string;
  ownerLabel?: string;
  roles: AllowedRole[];
  href?: string;
  section?: DashboardSection;
};

type MenuGroup = {
  id: MenuGroupId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: AllowedRole[];
  items: MenuItem[];
};

type UserNavbarProps = {
  onSectionChange?: (section: DashboardSection) => void;
  onCreateUser?: () => void;
};

const GLOBAL_ROLES: AllowedRole[] = ["superAdmin"];
const PROPERTY_MANAGER_ROLES: AllowedRole[] = ["superAdmin", "owner"];

const menuGroups: MenuGroup[] = [
  {
    id: "users",
    label: "User Management",
    icon: FaUsers,
    roles: PROPERTY_MANAGER_ROLES,
    items: [
      {
        id: "users-list",
        label: "All Users",
        ownerLabel: "My Tenants",
        roles: PROPERTY_MANAGER_ROLES,
        href: "/dashboard/users",
      },
      {
        id: "create-user",
        label: "Create User",
        ownerLabel: "Create Tenant",
        roles: PROPERTY_MANAGER_ROLES,
        href: "/dashboard/users/create",
      },
    ],
  },
  {
    id: "rent",
    label: "Rent Management",
    icon: FaBuilding,
    roles: PROPERTY_MANAGER_ROLES,
    items: [
      {
        id: "properties",
        label: "Properties & Apartments",
        ownerLabel: "My Properties & Apartments",
        roles: PROPERTY_MANAGER_ROLES,
        href: "/dashboard/properties",
      },
    ],
  },
];

const UserNavbar = ({ onSectionChange, onCreateUser }: UserNavbarProps) => {
  const { user, isAuthLoading } = useAuth();
  const pathname = usePathname();
  const navbarRef = useRef<HTMLDivElement>(null);

  const [openMenu, setOpenMenu] = useState<MenuGroupId | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection | null>(
    null,
  );

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
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (isAuthLoading) {
    return (
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!user || !["superAdmin", "owner"].includes(user.role)) {
    return null;
  }

  const currentRole = user.role as AllowedRole;
  const hasGlobalAccess = GLOBAL_ROLES.includes(currentRole);

  const availableGroups = menuGroups
    .filter((group) => group.roles.includes(currentRole))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(currentRole)),
    }));

  const isPathActive = (href?: string) => {
    if (!href) return false;

    if (href === "/dashboard/users") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    setOpenMenu(null);
    onSectionChange?.(section);

    if (section === "create-user") onCreateUser?.();
  };

  return (
    <nav className="relative z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
      <div
        ref={navbarRef}
        className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-1.5 px-4 py-2 sm:px-6 lg:px-8"
      >
        <span className="mr-2 hidden text-xs font-medium uppercase tracking-wider text-slate-500 md:block">
          {hasGlobalAccess ? "Management" : "My Management"}
        </span>

        {availableGroups.map((group) => {
          const GroupIcon = group.icon;
          const hasActiveRoute = group.items.some((item) =>
            isPathActive(item.href),
          );
          const hasActiveSection = group.items.some(
            (item) => item.section === activeSection,
          );
          const isGroupActive = hasActiveRoute || hasActiveSection;
          const isOpen = openMenu === group.id;

          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === group.id ? null : group.id,
                  )
                }
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  isGroupActive || isOpen
                    ? "bg-slate-800 text-emerald-300"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <GroupIcon className="text-sm" />
                <span>{group.label}</span>
                <FaChevronDown
                  className={`text-[10px] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/30"
                >
                  <div className="max-h-80 space-y-0.5 overflow-y-auto">
                    {group.items.map((item) => {
                      const itemLabel =
                        currentRole === "owner" && item.ownerLabel
                          ? item.ownerLabel
                          : item.label;
                      const isRouteActive = isPathActive(item.href);
                      const isSectionActive = item.section === activeSection;
                      const isActive = isRouteActive || isSectionActive;

                      const content = (
                        <>
                          <span>{itemLabel}</span>
                          {isActive && (
                            <FaCheck className="shrink-0 text-[10px] text-emerald-400" />
                          )}
                        </>
                      );

                      const className = `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/60 ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`;

                      return item.href ? (
                        <Link
                          key={item.id}
                          href={item.href}
                          role="menuitem"
                          aria-current={isRouteActive ? "page" : undefined}
                          onClick={() => setOpenMenu(null)}
                          className={className}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            item.section && handleSectionChange(item.section)
                          }
                          className={className}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default UserNavbar;
