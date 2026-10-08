"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type LoginResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    user?: {
      id: string;
      email: string;
      role: "superAdmin" | "owner" | "tenant" | "user";
      name?: {
        firstName: string;
        middleName?: string | null;
        lastName: string;
      };
      photo?: string | null;
    };
  };
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    setError("");

    setIsLoading(true);

    try {
      const response = await apiFetch(
        "/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
        false,
      );

      const result = (await response
        .json()
        .catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Email or password is incorrect.",
        );
      }

      const loggedInUser = result?.data?.user;

      if (!loggedInUser?.id || !loggedInUser.email || !loggedInUser.role) {
        throw new Error(
          "Login successful, but user information was not returned.",
        );
      }

      // Tokens remain inside HttpOnly cookies; only safe user data goes to Context.
      setUser(loggedInUser);
      router.replace(
        loggedInUser.role === "tenant"
          ? "/dashboard/my-apartment"
          : "/dashboard",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-44 items-center justify-center">
            <Image
              src="/logo.png"
              alt="AHB Home Management System"
              width={176}
              height={56}
              priority
              className="h-auto max-h-14 w-auto max-w-44 object-contain brightness-0 invert"
            />
          </div>

          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Home Management Software
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                minLength={1}
                maxLength={128}
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-3 pl-4 pr-12 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 outline-none transition hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? (
                  <FaEyeSlash aria-hidden="true" />
                ) : (
                  <FaEye aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white outline-none transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
