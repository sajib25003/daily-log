"use client";

import UserNavbar from "@/components/Dashboard/UserNavbar/UserNavbar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const { user, isAuthLoading } = useAuth();

  useEffect(() => {
    /*
     * Auth check শেষ হওয়ার পরও user না থাকলে
     * login page "/"-এ পাঠাবে।
     */
    if (!isAuthLoading && !user) {
      router.replace("/");
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[70vh] items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-4"
      >
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 px-10 py-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="relative mx-auto h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/15" />

            <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />

            <div className="absolute inset-3 flex items-center justify-center rounded-full bg-slate-800">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
            </div>
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-200">
            Checking authentication
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Please wait while we verify your session...
          </p>
        </div>

        <span className="sr-only">Checking authentication. Please wait.</span>
      </div>
    );
  }

  /*
   * Redirect complete হওয়ার আগে protected content
   * render হতে দেওয়া হবে না।
   */
  if (!user) {
    return null;
  }

  return (
    <>
      {/* {(user.role === "superAdmin" || user.role === "admin") && (
        <UserNavbar
          onSectionChange={(section) => {
            console.log("Selected section:", section);
          }}
          onCreateUser={() => {
            console.log("Open create-user modal");
          }}
        />
      )} */}
      {(user.role === "superAdmin" ||
        user.role === "admin" ||
        user.role === "owner") && <UserNavbar />}

      <div>{children}</div>
    </>
  );
}
