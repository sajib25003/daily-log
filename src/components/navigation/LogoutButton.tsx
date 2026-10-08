"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaPowerOff, FaSpinner } from "react-icons/fa";

type LogoutResponse = {
  success?: boolean;
  message?: string;
};

type LogoutButtonProps = {
  onLogoutSuccess?: () => void;
};

export default function LogoutButton({
  onLogoutSuccess,
}: LogoutButtonProps) {
  const router = useRouter();
  const { setUser } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await apiFetch(
        "/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
        false,
      );

      const result = (await response
        .json()
        .catch(() => null)) as LogoutResponse | null;

      if (!response.ok) {
        throw new Error(result?.message || "Logout failed.");
      }

      // Access and refresh tokens are HttpOnly cookies.
      // The backend logout endpoint clears them; the frontend only resets user state.
      onLogoutSuccess?.();
      setUser(null);
      router.replace("/");
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
    <div className="w-full ">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label={isLoggingOut ? "Logging out" : "Logout"}
        aria-busy={isLoggingOut}
        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 outline-none transition duration-200 hover:bg-red-500/10 hover:text-red-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-inset ring-red-500/20 transition group-hover:bg-red-500/15">
          {isLoggingOut ? (
            <FaSpinner aria-hidden="true" className="animate-spin text-sm" />
          ) : (
            <FaPowerOff aria-hidden="true" className="text-sm" />
          )}
        </span>

        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
      </button>

      {logoutError && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-300"
        >
          {logoutError}
        </p>
      )}
    </div>
  );
}
