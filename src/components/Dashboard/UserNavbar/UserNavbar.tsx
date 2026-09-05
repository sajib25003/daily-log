"use client";

import { useAuth } from "@/context/AuthContext";
import { ComponentType, useEffect, useRef, useState } from "react";
import {
  FaBuilding,
  FaCheck,
  FaChevronDown,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

type AllowedRole = "superAdmin" | "admin";

type MenuGroupId = "users" | "rent";

export type DashboardSection =
  // User management
  | "all-users"
  | "admins"
  | "tenants"
  | "general-users"
  | "inactive-users"
  | "create-user"
  // Rent management
  | "properties"
  | "flats"
  | "tenant-assignments"
  | "rent-records"
  | "payments-dues"
  | "rent-receipts"
  | "rent-settings";

type MenuItem = {
  id: DashboardSection;
  label: string;
  adminLabel?: string;
  description: string;
  roles: AllowedRole[];
};

type MenuGroup = {
  id: MenuGroupId;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  roles: AllowedRole[];
  items: MenuItem[];
};

type UserNavbarProps = {
  onSectionChange?: (section: DashboardSection) => void;

  onCreateUser?: () => void;
};

const menuGroups: MenuGroup[] = [
  {
    id: "users",
    label: "User Management",
    icon: FaUsers,
    roles: ["superAdmin", "admin"],

    items: [
      {
        id: "all-users",
        label: "All Users",
        adminLabel: "My Tenants",
        description: "View and manage users",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "admins",
        label: "Admins / Owners",
        description: "View registered property owners",
        roles: ["superAdmin"],
      },
      {
        id: "tenants",
        label: "All Tenants",
        description: "View tenants from all owners",
        roles: ["superAdmin"],
      },
      {
        id: "general-users",
        label: "General Users",
        description: "View personal cashflow users",
        roles: ["superAdmin"],
      },
      {
        id: "inactive-users",
        label: "Inactive Users",
        adminLabel: "Inactive Tenants",
        description: "View inactive accounts",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "create-user",
        label: "Create User",
        adminLabel: "Create Tenant",
        description: "Create a new account",
        roles: ["superAdmin", "admin"],
      },
    ],
  },

  {
    id: "rent",
    label: "Rent Management",
    icon: FaBuilding,
    roles: ["superAdmin", "admin"],

    items: [
      {
        id: "properties",
        label: "All Properties",
        adminLabel: "My Properties",
        description: "Manage houses and properties",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "flats",
        label: "All Flats / Units",
        adminLabel: "My Flats / Units",
        description: "Manage rentable flats",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "tenant-assignments",
        label: "All Tenant Assignments",
        adminLabel: "My Tenant Assignments",
        description: "Manage flat and tenant connections",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "rent-records",
        label: "All Rent Records",
        adminLabel: "My Rent Records",
        description: "View monthly rent records",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "payments-dues",
        label: "All Payments & Dues",
        adminLabel: "My Payments & Dues",
        description: "Track paid and due rent",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "rent-receipts",
        label: "All Rent Receipts",
        adminLabel: "My Rent Receipts",
        description: "View generated receipts",
        roles: ["superAdmin", "admin"],
      },
      {
        id: "rent-settings",
        label: "Rent Settings",
        adminLabel: "My Rent Settings",
        description: "Configure rent and bill settings",
        roles: ["superAdmin", "admin"],
      },
    ],
  },
];

const UserNavbar = ({ onSectionChange, onCreateUser }: UserNavbarProps) => {
  const { user, isAuthLoading } = useAuth();

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

  if (isAuthLoading) {
    return (
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200" />

          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  /*
   * এই management navbar শুধু superAdmin এবং admin দেখবে।
   */
  if (!user || (user.role !== "superAdmin" && user.role !== "admin")) {
    return null;
  }

  const currentRole: AllowedRole = user.role;

  const availableGroups = menuGroups
    .filter((group) => group.roles.includes(currentRole))
    .map((group) => ({
      ...group,

      items: group.items.filter((item) => item.roles.includes(currentRole)),
    }));

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    setOpenMenu(null);

    onSectionChange?.(section);

    if (section === "create-user") {
      onCreateUser?.();
    }
  };

  return (
    <div className="border-b border-slate-200 bg-slate-600  shadow-sm flex justify-center">
      <div
        ref={navbarRef}
        className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1 sm:px-6 lg:px-8"
      >
        {availableGroups.map((group) => {
          const GroupIcon = group.icon;

          const isGroupActive = group.items.some(
            (item) => item.id === activeSection,
          );

          return (
            <div key={group.id} className="relative">
              {/* Main menu button */}
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={openMenu === group.id}
                onClick={() =>
                  setOpenMenu((currentMenu) =>
                    currentMenu === group.id ? null : group.id,
                  )
                }
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isGroupActive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "text-slate-50 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <GroupIcon className="text-sm" />

                <span>{group.label}</span>

                <FaChevronDown
                  className={`text-xs transition-transform duration-200 ${
                    openMenu === group.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {openMenu === group.id && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3 pb-3 pt-2">
                    <div className="flex items-center gap-2">
                      <GroupIcon className="text-emerald-600" />

                      <p className="text-sm font-semibold text-slate-900">
                        {group.label}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id;

                      const isCreateUser = item.id === "create-user";

                      const itemLabel =
                        currentRole === "admin" && item.adminLabel
                          ? item.adminLabel
                          : item.label;

                      return (
                        <div
                          key={item.id}
                          className={
                            isCreateUser
                              ? "mt-2 border-t border-slate-100 pt-2"
                              : ""
                          }
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleSectionChange(item.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : isCreateUser
                                  ? "text-emerald-700 hover:bg-emerald-50"
                                  : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              {isCreateUser && (
                                <FaUserPlus className="mt-1 shrink-0 text-sm" />
                              )}

                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {itemLabel}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            {isActive && (
                              <FaCheck className="shrink-0 text-xs text-emerald-600" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserNavbar;
