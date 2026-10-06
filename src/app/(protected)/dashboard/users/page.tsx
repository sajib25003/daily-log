"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Swal from "sweetalert2";
import {
  FaEdit,
  FaFilter,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaTrashAlt,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

type UserRole = "superAdmin" | "admin" | "owner" | "tenant" | "user";
type UserStatus = "active" | "inactive";

type UserName = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
};

type UserReference = {
  _id?: string;
  id?: string;
  name?: UserName;
  email?: string;
  role?: UserRole;
};

type ManagedUser = {
  _id?: string;
  id?: string;
  name: UserName;
  email: string;
  phone?: string;
  photo?: string | null;
  role: UserRole;
  userStatus: UserStatus;
  address?: string;
  ownerId?: string | UserReference | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
};

type UsersResponse = {
  success: boolean;
  message?: string;
  data?: ManagedUser[];
};

type UserMutationResponse = {
  success: boolean;
  message?: string;
  data?: ManagedUser;
};

type UserDependencySummary = {
  ownedUsers: number;
  createdUsers: number;
  relatedUsers: number;
  total: number;
};

type DeleteUserResponse = {
  success: boolean;
  message?: string;
  data?: {
    deletionType: "hard" | "soft";
    user: ManagedUser;
    dependencies: UserDependencySummary;
  };
};

type EditForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  address: string;
  userStatus: UserStatus;
};

const roleLabels: Record<UserRole, string> = {
  superAdmin: "Super Admin",
  admin: "Admin",
  owner: "Owner",
  tenant: "Tenant",
  user: "General User",
};

const roleBadgeClasses: Record<UserRole, string> = {
  superAdmin:
    "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/20",
  admin: "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/20",
  owner: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/20",
  tenant:
    "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  user: "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/20",
};

const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const getUserId = (user: Pick<ManagedUser, "_id" | "id">) =>
  user._id ?? user.id ?? "";

const getReferenceId = (reference?: string | UserReference | null) => {
  if (!reference) return "";
  if (typeof reference === "string") return reference;
  return reference._id ?? reference.id ?? "";
};

const formatName = (name?: UserName) => {
  if (!name) return "Unknown User";

  return [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const getOwnerName = (
  ownerId: ManagedUser["ownerId"],
  users: ManagedUser[],
) => {
  if (!ownerId) return "—";

  if (typeof ownerId === "object" && ownerId.name) {
    return formatName(ownerId.name);
  }

  const ownerIdValue = getReferenceId(ownerId);
  const owner = users.find((item) => getUserId(item) === ownerIdValue);

  return owner ? formatName(owner.name) : "Assigned owner";
};

const requestUsers = async () => {
  const response = await apiFetch("/users", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result = (await response
    .json()
    .catch(() => null)) as UsersResponse | null;

  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to load users.");
  }

  return Array.isArray(result?.data) ? result.data : [];
};

export default function UserManagementPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingStatusUserId, setUpdatingStatusUserId] = useState<
    string | null
  >(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const hasGlobalAccess = user?.role === "superAdmin" || user?.role === "admin";
  const isOwner = user?.role === "owner";

  useEffect(() => {
    let isCancelled = false;

    const loadInitialUsers = async () => {
      try {
        const result = await requestUsers();

        if (!isCancelled) {
          setUsers(result);
          setError("");
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load users.",
          );
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void loadInitialUsers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const owners = useMemo(
    () => users.filter((managedUser) => managedUser.role === "owner"),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((managedUser) => {
      if (isOwner && managedUser.role !== "tenant") return false;

      if (roleFilter !== "all" && managedUser.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== "all" && managedUser.userStatus !== statusFilter) {
        return false;
      }

      if (ownerFilter !== "all") {
        const isSelectedOwner = getUserId(managedUser) === ownerFilter;
        const belongsToSelectedOwner =
          getReferenceId(managedUser.ownerId) === ownerFilter;

        if (!isSelectedOwner && !belongsToSelectedOwner) return false;
      }

      if (!normalizedSearch) return true;

      const searchableValue = [
        formatName(managedUser.name),
        managedUser.email,
        managedUser.phone,
        roleLabels[managedUser.role],
        getOwnerName(managedUser.ownerId, users),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(normalizedSearch);
    });
  }, [isOwner, ownerFilter, roleFilter, search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const firstItemIndex = (activePage - 1) * itemsPerPage;
  const paginatedUsers = visibleUsers.slice(
    firstItemIndex,
    firstItemIndex + itemsPerPage,
  );
  const firstVisibleItem = visibleUsers.length === 0 ? 0 : firstItemIndex + 1;
  const lastVisibleItem = Math.min(
    firstItemIndex + itemsPerPage,
    visibleUsers.length,
  );

  const summary = useMemo(
    () => ({
      total: isOwner
        ? users.filter((managedUser) => managedUser.role === "tenant").length
        : users.length,
      owners: users.filter((managedUser) => managedUser.role === "owner")
        .length,
      tenants: users.filter((managedUser) => managedUser.role === "tenant")
        .length,
      active: users.filter(
        (managedUser) =>
          managedUser.userStatus === "active" &&
          (!isOwner || managedUser.role === "tenant"),
      ).length,
      inactive: users.filter(
        (managedUser) =>
          managedUser.userStatus === "inactive" &&
          (!isOwner || managedUser.role === "tenant"),
      ).length,
    }),
    [isOwner, users],
  );

  const refreshUsers = async () => {
    setIsRefreshing(true);
    setError("");

    try {
      setUsers(await requestUsers());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to refresh users.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openEditModal = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setEditForm({
      firstName: managedUser.name.firstName,
      middleName: managedUser.name.middleName ?? "",
      lastName: managedUser.name.lastName,
      phone: managedUser.phone ?? "",
      address: managedUser.address ?? "",
      userStatus: managedUser.userStatus,
    });
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setEditingUser(null);
    setEditForm(null);
  };

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser || !editForm || isSaving) return;

    const userId = getUserId(editingUser);

    if (!userId) {
      setError("The selected user does not have a valid ID.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user: {
            name: {
              firstName: editForm.firstName.trim(),
              middleName: editForm.middleName.trim() || null,
              lastName: editForm.lastName.trim(),
            },
            phone: editForm.phone.trim(),
            address: editForm.address.trim(),
            userStatus: editForm.userStatus,
          },
        }),
      });

      const result = (await response
        .json()
        .catch(() => null)) as UserMutationResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to update user.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          getUserId(currentUser) === userId
            ? {
                ...currentUser,
                ...(result?.data ?? {}),
                ownerId: result?.data?.ownerId ?? currentUser.ownerId,
              }
            : currentUser,
        ),
      );

      setEditingUser(null);
      setEditForm(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update user.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (
    managedUser: ManagedUser,
    nextStatus: UserStatus,
  ) => {
    const userId = getUserId(managedUser);

    if (
      !userId ||
      userId === user?.id ||
      updatingStatusUserId ||
      managedUser.userStatus === nextStatus
    ) {
      return;
    }

    setUpdatingStatusUserId(userId);
    setError("");

    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user: {
            userStatus: nextStatus,
          },
        }),
      });

      const result = (await response
        .json()
        .catch(() => null)) as UserMutationResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to update user status.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          getUserId(currentUser) === userId
            ? {
                ...currentUser,
                ...(result?.data ?? {}),
                userStatus: result?.data?.userStatus ?? nextStatus,
                ownerId: result?.data?.ownerId ?? currentUser.ownerId,
              }
            : currentUser,
        ),
      );

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `User is now ${nextStatus}.`,
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update user status.",
      );
    } finally {
      setUpdatingStatusUserId(null);
    }
  };

  const handleDeleteUser = async (managedUser: ManagedUser) => {
    const userId = getUserId(managedUser);

    if (!userId || deletingUserId) return;

    const confirmation = await Swal.fire({
      title: "Delete this user?",
      text: `${formatName(managedUser.name)} will be permanently deleted if no connected data exists. Otherwise, the account will be archived and login access will be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete user",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#334155",
    });

    if (!confirmation.isConfirmed) return;

    setDeletingUserId(userId);
    setError("");

    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const result = (await response
        .json()
        .catch(() => null)) as DeleteUserResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to delete user.");
      }

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => getUserId(currentUser) !== userId),
      );

      const wasArchived = result?.data?.deletionType === "soft";
      const dependencyCount = result?.data?.dependencies.total ?? 0;

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: wasArchived
          ? `User archived (${dependencyCount} connected record${dependencyCount === 1 ? "" : "s"}).`
          : "User permanently deleted.",
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete user.",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!hasGlobalAccess && !isOwner) {
    return (
      <main className="min-h-[70vh] bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl">
          <FaUserShield className="mx-auto text-3xl text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-100">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Only administrators and property owners can manage users.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl shadow-indigo-950/30 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                User Management
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {isOwner ? "My Tenants" : "All System Users"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {isOwner
                  ? "View and manage the tenants connected to your account."
                  : "Search users, filter them by owner, and maintain account information."}
              </p>
            </div>

            <button
              type="button"
              onClick={refreshUsers}
              disabled={isRefreshing}
              className="flex w-fit items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {user?.role === "superAdmin" && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total Users" value={summary.total} />
            <SummaryCard label="Owners" value={summary.owners} />
            <SummaryCard label="Tenants" value={summary.tenants} />
            <SummaryCard
              label="Active Accounts"
              value={summary.active}
              accent
            />
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <FaFilter className="text-emerald-400" />
            Filters
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative xl:col-span-1">
              <span className="sr-only">Search users</span>
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name, email or phone"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>

            {hasGlobalAccess && (
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as "all" | UserRole);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All roles</option>
                <option value="superAdmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="user">General User</option>
              </select>
            )}

            {hasGlobalAccess && (
              <select
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All owners</option>
                {owners.map((owner) => (
                  <option key={getUserId(owner)} value={getUserId(owner)}>
                    {formatName(owner.name)}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | UserStatus);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-slate-700/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                <FaUsers />
              </div>
              <div>
                <h2 className="font-bold text-slate-100">
                  {isOwner ? "Tenant Accounts" : "User Accounts"}
                </h2>
              </div>
            </div>

            {user?.role !== "superAdmin" && (
              <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                <CompactSummaryItem
                  label={isOwner ? "Tenants" : "Users"}
                  value={summary.total}
                />
                <CompactSummaryItem
                  label="Active"
                  value={summary.active}
                  tone="active"
                />
                <CompactSummaryItem
                  label="Inactive"
                  value={summary.inactive}
                  tone="inactive"
                />
              </div>
            )}
          </div>

          {isLoading ? (
            <UserTableSkeleton />
          ) : visibleUsers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FaUsers className="mx-auto text-4xl text-slate-600" />
              <p className="mt-4 font-semibold text-slate-200">
                No matching users found
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Try changing the current filters.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700/60">
                  <thead className="bg-slate-950/70">
                    <tr>
                      <TableHeading>User</TableHeading>
                      <TableHeading>Role</TableHeading>
                      {hasGlobalAccess && <TableHeading>Owner</TableHeading>}
                      <TableHeading>Contact</TableHeading>
                      <TableHeading>Status</TableHeading>
                      <TableHeading align="right">Actions</TableHeading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {paginatedUsers.map((managedUser) => {
                      const managedUserId = getUserId(managedUser);
                      const isCurrentUser = managedUserId === user?.id;
                      const isDeleting = deletingUserId === managedUserId;
                      const isUpdatingStatus =
                        updatingStatusUserId === managedUserId;

                      return (
                        <tr
                          key={managedUserId}
                          className="transition hover:bg-slate-800/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                                {managedUser.name.firstName
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-100">
                                  {formatName(managedUser.name)}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs font-medium text-indigo-300">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {managedUser.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClasses[managedUser.role]}`}
                            >
                              {roleLabels[managedUser.role]}
                            </span>
                          </td>
                          {hasGlobalAccess && (
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                              {managedUser.role === "owner"
                                ? "Self"
                                : getOwnerName(managedUser.ownerId, users)}
                            </td>
                          )}
                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="text-sm text-slate-200">
                              {managedUser.phone || "No phone"}
                            </p>
                            <p className="max-w-52 truncate text-xs text-slate-400">
                              {managedUser.address || "No address"}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <select
                              value={managedUser.userStatus}
                              onChange={(event) =>
                                void handleStatusChange(
                                  managedUser,
                                  event.target.value as UserStatus,
                                )
                              }
                              disabled={
                                isCurrentUser ||
                                isUpdatingStatus ||
                                Boolean(updatingStatusUserId)
                              }
                              aria-label={`Change status for ${formatName(managedUser.name)}`}
                              title={
                                isCurrentUser
                                  ? "You cannot change your own status"
                                  : "Change account status"
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                                managedUser.userStatus === "active"
                                  ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                                  : "border-red-500/20 bg-red-500/15 text-red-300"
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(managedUser)}
                                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300"
                                aria-label={`Edit ${formatName(managedUser.name)}`}
                                title="Edit user"
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(managedUser)}
                                disabled={isCurrentUser || isDeleting}
                                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Delete ${formatName(managedUser.name)}`}
                                title={
                                  isCurrentUser
                                    ? "You cannot delete your own account"
                                    : "Delete user"
                                }
                              >
                                <FaTrashAlt
                                  className={isDeleting ? "animate-pulse" : ""}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-700/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <label htmlFor="items-per-page">Rows per page</label>
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="hidden sm:inline">
                    {firstVisibleItem}–{lastVisibleItem} of{" "}
                    {visibleUsers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                    disabled={activePage === 1}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="min-w-24 text-center text-sm text-slate-400">
                    Page {activePage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, activePage + 1))
                    }
                    disabled={activePage === totalPages}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {editingUser && editForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between border-b border-slate-700 px-6 py-5">
              <div>
                <h2
                  id="edit-user-title"
                  className="text-xl font-bold text-slate-100"
                >
                  Edit {formatName(editingUser.name)}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Email and role cannot be changed from this form.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close edit dialog"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First name">
                  <input
                    required
                    value={editForm.firstName}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, firstName: event.target.value }
                          : current,
                      )
                    }
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Middle name">
                  <input
                    value={editForm.middleName}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, middleName: event.target.value }
                          : current,
                      )
                    }
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Last name">
                  <input
                    required
                    value={editForm.lastName}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, lastName: event.target.value }
                          : current,
                      )
                    }
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Phone">
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, phone: event.target.value }
                          : current,
                      )
                    }
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Status">
                  <select
                    value={editForm.userStatus}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? {
                              ...current,
                              userStatus: event.target.value as UserStatus,
                            }
                          : current,
                      )
                    }
                    disabled={getUserId(editingUser) === user?.id}
                    title={
                      getUserId(editingUser) === user?.id
                        ? "You cannot change your own status"
                        : "Change account status"
                    }
                    className={FORM_INPUT_CLASS}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Address">
                <textarea
                  rows={3}
                  value={editForm.address}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, address: event.target.value }
                        : current,
                    )
                  }
                  className={`${FORM_INPUT_CLASS} resize-none`}
                />
              </FormField>

              <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          accent ? "text-emerald-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CompactSummaryItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "active" | "inactive";
}) {
  const toneClass = {
    default: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    inactive: "border-red-500/20 bg-red-500/10 text-red-300",
  }[tone];

  return (
    <div className={`min-w-20 rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-medium opacity-75">{label}</p>
      <p className="mt-0.5 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function UserTableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-slate-800"
        />
      ))}
    </div>
  );
}
