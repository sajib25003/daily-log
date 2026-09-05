"use client";

import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

type LoginResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    user?: {
      id: string;
      email: string;
      role: "superAdmin" | "admin" | "tenant" | "user";

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

  /*
   * AuthProvider-এর shared state।
   * এখানে user set করলে NavBar useAuth() দিয়ে পেয়ে যাবে।
   */
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        /*
         * Backend-এর HttpOnly accessToken এবং refreshToken
         * cookie browser-এ receive করার জন্য প্রয়োজন।
         */
        credentials: "include",

        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

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

      /*
       * Token HttpOnly cookie-তে backend রেখেছে।
       * তাই token localStorage-এ রাখা হচ্ছে না।
       *
       * শুধু non-sensitive user information Context-এ রাখা হচ্ছে।
       * NavBar এখান থেকেই email, name এবং role পাবে।
       */
      setUser(loggedInUser);

      /*
       * RootLayout navigation-এর সময় unmount হবে না।
       * তাই Context-এর user data সংরক্ষিত থাকবে।
       */
      router.replace("/dashboard");
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
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Image
              src="/AHB-logo.png"
              alt="AHB Logo"
              width={32}
              height={32}
              priority
              className="rounded-full"
            />

            <h1 className="text-3xl font-bold text-slate-100">AHB</h1>
          </div>

          <p className="text-lg text-slate-300">Home Management Software</p>
        </div>

        {/* Login form */}
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-slate-300"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
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
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
