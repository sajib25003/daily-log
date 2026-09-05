"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaPowerOff, FaSpinner } from "react-icons/fa";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function LogoutButton() {
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Logout failed.");
      }

      // আগের implementation-এর কোনো token থেকে থাকলে remove করবে
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");

      router.replace("/");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to logout. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="group relative mr-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Logout"
        aria-describedby="logout-tooltip"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? (
          <FaSpinner className="animate-spin text-base" />
        ) : (
          <FaPowerOff className="text-base transition-transform group-hover:scale-110" />
        )}
      </button>

      {!logoutError && (
        <span
          id="logout-tooltip"
          role="tooltip"
          className="pointer-events-none absolute top-12 right-0 z-50 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </span>
      )}

      {logoutError && (
        <span
          role="alert"
          className="absolute top-12 right-0 z-50 w-48 rounded-lg border border-red-500/30 bg-slate-950 px-3 py-2 text-xs text-red-400 shadow-xl"
        >
          {logoutError}
        </span>
      )}
    </div>
  );
}
