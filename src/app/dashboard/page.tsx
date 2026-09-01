import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const receiptTypes = [
  {
    title: "Shopnoneer Receipt-7D",
    description: "৭-D ফ্ল্যাটের মাসিক ভাড়া ও অন্যান্য বিলের রশিদ তৈরি করুন।",
    href: "/dashboard/rent-receipt-shopnoneer",
    color: "from-blue-600 to-indigo-600",
  },
  {
    title: "M2 Receipt-6A",
    description: "৬-A ফ্ল্যাটের মাসিক ভাড়া ও অন্যান্য বিলের রশিদ তৈরি করুন।",
    href: "/dashboard/rent-receipt-6A",
    color: "from-emerald-600 to-teal-600",
  },
];

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Dashboard content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-7 text-white shadow-xl sm:p-10">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-blue-300">
              Receipt Dashboard
            </p>

            <h2 className="text-3xl font-bold sm:text-4xl">
              স্বাগতম, {session.user?.name || "User"}
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              এখান থেকে ফ্ল্যাটের মাসিক ভাড়া, বিদ্যুৎ, পানি এবং অন্যান্য বিলের
              রশিদ তৈরি ও প্রিন্ট করতে পারবেন।
            </p>
          </div>
        </section>

        {/* Summary */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Available Receipts"
            value="2"
            description="বর্তমানে ব্যবহারযোগ্য রশিদ"
          />

          <SummaryCard
            label="Current Month"
            value={new Intl.DateTimeFormat("en-US", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
            description="চলতি বিলের মাস"
          />

          <SummaryCard
            label="System Status"
            value="Active"
            description="Receipt system সচল রয়েছে"
            valueColor="text-emerald-600"
          />
        </section>

        {/* Receipt options */}
        <section className="mt-10">
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-slate-900">
              Create Receipt
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              যে ফ্ল্যাটের রশিদ তৈরি করতে চান সেটি নির্বাচন করুন।
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {receiptTypes.map((receipt) => (
              <Link
                key={receipt.href}
                href={receipt.href}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${receipt.color} text-xl font-bold text-white shadow-md`}
                >
                  {receipt.title.split("-")[1]}
                </div>

                <h4 className="text-xl font-bold text-slate-900">
                  {receipt.title}
                </h4>

                <p className="mt-2 leading-6 text-slate-500">
                  {receipt.description}
                </p>

                <div className="mt-6 flex items-center font-semibold text-blue-600">
                  রশিদ তৈরি করুন
                  <span className="ml-2 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueColor?: string;
};

function SummaryCard({
  label,
  value,
  description,
  valueColor = "text-slate-900",
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}
