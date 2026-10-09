"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const receiptTypes = [
  {
    title: "Shopnoneer Receipt-7D",
    shortName: "7D",
    description: "৭-D ফ্ল্যাটের মাসিক ভাড়া ও অন্যান্য বিলের রশিদ তৈরি করুন।",
    href: "/dashboard/rent-receipt-shopnoneer",
    color: "from-indigo-500 to-blue-600",
  },
  {
    title: "M2 Receipt-6A",
    shortName: "6A",
    description: "৬-A ফ্ল্যাটের মাসিক ভাড়া ও অন্যান্য বিলের রশিদ তৈরি করুন।",
    href: "/dashboard/rent-receipt-M2",
    color: "from-emerald-500 to-teal-600",
  },
];

const roleLabels = {
  superAdmin: "Super Admin",
  owner: "Property Owner",
  tenant: "Tenant",
  user: "General User",
} as const;

export default function DashboardPage() {
  const { user } = useAuth();

  const hasGlobalAccess = user?.role === "superAdmin";

  const isPropertyManager = hasGlobalAccess || user?.role === "owner";

  const displayName = getDisplayName(user);

  const roleLabel = user?.role ? roleLabels[user.role] : "User";

  const isManagementUser = user?.role === "superAdmin";

  const currentMonth = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
          {/* Background decorations */}
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Dashboard
                </span>
                {/* 
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {roleLabel}
                </span> */}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                স্বাগতম, <span className="text-emerald-500">{displayName}</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                এখান থেকে আপনার ফ্ল্যাট, ভাড়া, মাসিক বিল এবং রশিদ সংক্রান্ত
                প্রয়োজনীয় কার্যক্রম পরিচালনা করতে পারবেন।
              </p>
            </div>

            <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-950/40 p-5 lg:w-auto lg:min-w-64">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Signed in as
                <span className="ml-2 rounded truncate   capitalize border-l border-r border-emerald-400 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                  {roleLabel}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Available Receipts"
            value={receiptTypes.length.toString()}
            description="বর্তমানে ব্যবহারযোগ্য রশিদ"
            accentColor="bg-indigo-500"
          />

          <SummaryCard
            label="Current Month"
            value={currentMonth}
            description="চলতি হিসাবের মাস"
            accentColor="bg-blue-500"
          />

          <SummaryCard
            label="System Status"
            value="Active"
            description="AHB management system সচল রয়েছে"
            valueColor="text-emerald-400"
            accentColor="bg-emerald-500"
          />
        </section>

        {/* Management section */}
        {isManagementUser && (
          <section className="mt-10">
            <SectionHeading
              title="Management"
              description={
                user?.role === "superAdmin"
                  ? "সকল user, property এবং rent information পরিচালনা করুন।"
                  : "আপনার tenant, property এবং rent information পরিচালনা করুন।"
              }
            />

            <div className="grid gap-5 md:grid-cols-2">
              <ManagementCard
                title="User Management"
                description={
                  user?.role === "superAdmin"
                    ? "সকল owner, tenant এবং general user দেখুন ও পরিচালনা করুন।"
                    : "আপনার অধীনে থাকা tenant account দেখুন ও পরিচালনা করুন।"
                }
                href="/dashboard/users"
                buttonLabel={
                  user?.role === "superAdmin"
                    ? "View all users"
                    : "View my tenants"
                }
                icon="U"
                color="from-indigo-500 to-violet-600"
              />

              <ManagementCard
                title="Rent Management"
                description={
                  user?.role === "superAdmin"
                    ? "সকল property, flat, rent এবং payment record পরিচালনা করুন।"
                    : "আপনার property, flat, rent এবং payment record পরিচালনা করুন।"
                }
                href="/dashboard/rents"
                buttonLabel={
                  user?.role === "superAdmin"
                    ? "View all rent records"
                    : "View my rent records"
                }
                icon="R"
                color="from-cyan-500 to-blue-600"
              />
            </div>
          </section>
        )}

        {/* Receipt section */}
        {user?.role === "superAdmin" && (
          <section className="mt-10">
            <SectionHeading
              title="Create Receipt"
              description="যে ফ্ল্যাটের রশিদ তৈরি করতে চান সেটি নির্বাচন করুন।"
            />

            <div className="grid gap-5 md:grid-cols-2">
              {receiptTypes.map((receipt) => (
                <Link
                  key={receipt.href}
                  href={receipt.href}
                  className="group relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-indigo-950/40"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl transition group-hover:bg-indigo-500/20" />

                  <div className="relative">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${receipt.color} text-lg font-bold text-white shadow-lg`}
                    >
                      {receipt.shortName}
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-slate-100">
                      {receipt.title}
                    </h3>

                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                      {receipt.description}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-700/60 pt-5">
                      <span className="font-semibold text-indigo-400 transition group-hover:text-indigo-300">
                        রশিদ তৈরি করুন
                      </span>

                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-indigo-300 transition group-hover:translate-x-1 group-hover:border-indigo-500/50">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

type AuthUserData = {
  email: string;

  name?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
  };
} | null;

function getDisplayName(user: AuthUserData) {
  if (!user) {
    return "User";
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

  return user.email.split("@")[0] || "User";
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueColor?: string;
  accentColor: string;
};

function SummaryCard({
  label,
  value,
  description,
  valueColor = "text-slate-100",
  accentColor,
}: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${accentColor}`}
        aria-hidden="true"
      />

      <p className="text-sm font-medium text-slate-400">{label}</p>

      <p className={`mt-3 text-2xl font-bold ${valueColor}`}>{value}</p>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

type SectionHeadingProps = {
  title: string;
  description: string;
};

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

type ManagementCardProps = {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
  icon: string;
  color: string;
};

function ManagementCard({
  title,
  description,
  href,
  buttonLabel,
  icon,
  color,
}: ManagementCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-500/50"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${color} font-bold text-white shadow-lg`}
      >
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-100">{title}</h3>

      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <div className="mt-5 flex items-center font-semibold text-indigo-400 transition group-hover:text-indigo-300">
        {buttonLabel}
        <span className="ml-2 transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
