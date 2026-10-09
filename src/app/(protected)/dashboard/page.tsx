"use client";

import { useAuth } from "@/context/AuthContext";
import {
  getMyCurrentTenancy,
  listActiveTenancies,
  listProperties,
} from "@/lib/propertyApi";
import { listRentBills } from "@/lib/rentBillApi";
import { formatUserName } from "@/types/property";
import type { Property, Tenancy } from "@/types/property";
import type { RentBillListData } from "@/types/rentBill";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const roleLabels = {
  superAdmin: "Super Admin",
  owner: "Property Owner",
  tenant: "Tenant",
  user: "General User",
};

type DashboardData = {
  properties: Property[];
  activeTenancies: number;
  tenancy: Tenancy | null;
  monthly: RentBillListData;
  outstanding: RentBillListData;
};

type LoadState = { key: string; data?: DashboardData; error?: string };

export default function DashboardPage() {
  const { user, isAuthLoading } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const isManager = user?.role === "superAdmin" || user?.role === "owner";
  const hasBilling = isManager || user?.role === "tenant";
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(dateParts.find((part) => part.type === "year")?.value);
  const month = Number(dateParts.find((part) => part.type === "month")?.value);
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const currentMonth = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const key = `${user?.id}:${user?.role}:${period}:${refresh}`;
  const data = state?.key === key ? state.data : undefined;
  const error = state?.key === key ? state.error : undefined;
  const loading = hasBilling && state?.key !== key;

  useEffect(() => {
    if (!user || !hasBilling) return;
    let cancelled = false;
    async function load() {
      try {
        const [monthly, outstanding, properties, tenancies, tenancy] =
          await Promise.all([
            listRentBills({ year, month, limit: 5 }),
            listRentBills({ status: "due", limit: 1 }),
            isManager ? listProperties() : Promise.resolve([]),
            isManager
              ? listActiveTenancies({ limit: 1 })
              : Promise.resolve(null),
            !isManager ? getMyCurrentTenancy() : Promise.resolve(null),
          ]);
        if (!cancelled)
          setState({
            key,
            data: {
              monthly,
              outstanding,
              properties,
              activeTenancies: tenancies?.meta.total ?? 0,
              tenancy,
            },
          });
      } catch (requestError) {
        if (!cancelled)
          setState({
            key,
            error:
              requestError instanceof Error
                ? requestError.message
                : "Failed to load dashboard.",
          });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, hasBilling, isManager, key, year, month]);

  if (isAuthLoading)
    return (
      <main className="min-h-[70vh] bg-slate-950 p-8 text-slate-400">
        Loading dashboard…
      </main>
    );
  if (!user) return null;

  const apartments = data?.properties.reduce(
    (total, property) => total + (property.apartmentCount ?? 0),
    0,
  );
  const name = user.name ? formatUserName(user.name) : user.email.split("@")[0];
  const actions = isManager
    ? [
        {
          title: "Properties & Apartments",
          detail: "Property, apartment ও tenant assignment পরিচালনা করুন।",
          href: "/dashboard/properties",
        },
        {
          title: "Generate Rent Bill",
          detail: "Tenant-এর জন্য মাসিক ভাড়া ও অন্যান্য বিল তৈরি করুন।",
          href: "/dashboard/rent-bills/generate",
        },
        {
          title: "Rent Bill History",
          detail: "বিল, payment status ও receipt দেখুন।",
          href: "/dashboard/rent-bills",
        },
        {
          title: user.role === "owner" ? "My Tenants" : "User Management",
          detail: "User account দেখুন ও পরিচালনা করুন।",
          href: "/dashboard/users",
        },
        {
          title: "Rent Settings",
          detail: "ভাড়া ও মাসিক charge configure করুন।",
          href: "/dashboard/rent-settings",
        },
        {
          title: "Electricity",
          detail: "Meter ও electricity billing settings পরিচালনা করুন।",
          href: "/dashboard/electricity",
        },
        {
          title: "Property Ledger",
          detail: "Property আয়-ব্যয় ও report দেখুন।",
          href: "/dashboard/property-ledger",
        },
      ]
    : user.role === "tenant"
      ? [
          {
            title: "My Apartment",
            detail: "আপনার বর্তমান apartment ও tenancy information দেখুন।",
            href: "/dashboard/my-apartment",
          },
          {
            title: "My Rent Bills",
            detail: "আপনার মাসিক বিল ও receipt দেখুন।",
            href: "/dashboard/rent-bills",
          },
        ]
      : [];

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col gap-5 rounded-3xl border border-indigo-500/20 bg-slate-900/80 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {roleLabels[user.role]} · {currentMonth}
            </p>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              স্বাগতম, <span className="text-emerald-400">{name}</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              আপনার property, tenancy ও মাসিক বিলের বর্তমান হিসাব।
            </p>
          </div>
          {hasBilling && (
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error} Use Refresh to try again.
          </div>
        )}
        {loading && (
          <p role="status" className="mt-5 text-sm text-slate-400">
            Loading latest data…
          </p>
        )}

        {hasBilling && (
          <>
            {isManager && (
              <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard
                  label="Properties"
                  value={data ? String(data.properties.length) : "—"}
                  detail="Available properties"
                />
                <SummaryCard
                  label="Apartments"
                  value={data ? String(apartments) : "—"}
                  detail="Across your properties"
                />
                <SummaryCard
                  label="Active Tenancies"
                  value={data ? String(data.activeTenancies) : "—"}
                  detail="Currently assigned tenants"
                />
                <SummaryCard
                  label="Vacant Apartments"
                  value={
                    data
                      ? String(
                          Math.max(0, (apartments ?? 0) - data.activeTenancies),
                        )
                      : "—"
                  }
                  detail="Without an active tenancy"
                />
              </section>
            )}
            {!isManager && data && (
              <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                <h2 className="font-bold">Current Apartment</h2>
                {data.tenancy ? (
                  <p className="mt-2 text-sm text-slate-300">
                    {typeof data.tenancy.propertyId === "object"
                      ? data.tenancy.propertyId.name
                      : "Property"}{" "}
                    ·{" "}
                    {typeof data.tenancy.apartmentId === "object"
                      ? data.tenancy.apartmentId.apartmentNumber
                      : "Apartment"}{" "}
                    <Link
                      href="/dashboard/my-apartment"
                      className="ml-3 text-indigo-300"
                    >
                      View details →
                    </Link>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    No apartment is currently assigned to you. Your previous
                    bills remain available in Rent Bill History.
                  </p>
                )}
              </section>
            )}
            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                label="This Month's Bills"
                value={data ? String(data.monthly.summary.totalBills) : "—"}
                detail={currentMonth}
              />
              <SummaryCard
                label="Paid This Billing Month"
                value={
                  data ? money.format(data.monthly.summary.paidAmount) : "—"
                }
                detail={
                  data
                    ? `${data.monthly.summary.paidCount} paid bills · ${currentMonth}`
                    : currentMonth
                }
              />
              <SummaryCard
                label="Due This Billing Month"
                value={
                  data
                    ? money.format(data.monthly.summary.outstandingAmount)
                    : "—"
                }
                detail={
                  data
                    ? `${data.monthly.summary.dueCount} due bills · ${currentMonth}`
                    : currentMonth
                }
              />
              <SummaryCard
                label="Total Outstanding"
                value={
                  data
                    ? money.format(data.outstanding.summary.outstandingAmount)
                    : "—"
                }
                detail={
                  data
                    ? `${data.outstanding.summary.dueCount} due bills · All months and years`
                    : "All months and years"
                }
              />
            </section>
          </>
        )}

        {actions.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 transition hover:border-indigo-500"
                >
                  <h3 className="font-semibold text-indigo-300">
                    {action.title} →
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {action.detail}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-6 rounded-2xl border border-slate-700 p-5 text-sm text-slate-400">
            আপনার account-এ property management access নেই। Access প্রয়োজন হলে
            administrator-এর সাথে যোগাযোগ করুন।
          </p>
        )}

        {data && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 p-5">
              <h2 className="font-bold">Recent Bills · {currentMonth}</h2>
              <Link
                href="/dashboard/rent-bills"
                className="text-sm text-indigo-300"
              >
                View history →
              </Link>
            </div>
            {data.monthly.items.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">
                No bills have been issued for this month.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/40 text-slate-400">
                    <tr>
                      <th className="p-4">Receipt</th>
                      <th className="p-4">Property / Apartment</th>
                      {isManager && <th className="p-4">Tenant</th>}
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.items.map((bill) => (
                      <tr key={bill._id} className="border-t border-slate-800">
                        <td className="whitespace-nowrap p-4">
                          {bill.receiptNumber}
                        </td>
                        <td className="p-4">
                          {bill.propertySnapshot.name} /{" "}
                          {bill.apartmentSnapshot.apartmentNumber}
                        </td>
                        {isManager && (
                          <td className="p-4">{bill.tenantSnapshot.name}</td>
                        )}
                        <td className="whitespace-nowrap p-4">
                          {money.format(bill.totalAmount)}
                        </td>
                        <td
                          className={`p-4 font-semibold capitalize ${bill.status === "paid" ? "text-emerald-300" : bill.status === "due" ? "text-amber-300" : "text-slate-400"}`}
                        >
                          {bill.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-slate-100 sm:text-2xl">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
