"use client";

import Logto from "next-auth/providers/logto";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FcGoogle } from "react-icons/fc";

const LOGIN_API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1/auth/login";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Email or password is incorrect.",
        );
      }

      /*
       * Token HttpOnly cookie-তে backend save করছে।
       * তাই localStorage-এ token save করার দরকার নেই।
       */
      router.replace("/dashboard");
      router.refresh();
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
        <div className="mb-8 text-center ">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div>
              <Image
                src={"/AHB-logo.png"}
                alt="AHB Logo"
                width={32}
                height={32}
                className="rounded-full mx-auto"
              />
            </div>

            <h1 className="text-3xl font-bold text-slate-100">AHB</h1>
          </div>
          <p className="text-lg">Home Management Software</p>
        </div>

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

        {/* Divider */}
        {/* <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />

          <span className="text-xs uppercase tracking-widest text-slate-500">
            Or continue with
          </span>

          <div className="h-px flex-1 bg-slate-700" />
        </div> */}

        {/* Social Login */}
        {/* <div className="flex justify-center"> */}
        {/* <button
            type="button"
            onClick={() =>
              signIn("facebook", {
                callbackUrl: "/dashboard",
              })
            }
            className="rounded-xl border border-slate-700 bg-slate-800 py-3 text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            Facebook
          </button> */}

        {/* <button
            type="button"
            onClick={() =>
              signIn("google", {
                callbackUrl: "/dashboard",
              })
            }
            className="rounded-xl flex items-center gap-2 border px-6 border-slate-700 bg-slate-800 py-3 text-slate-300 transition hover:border-red-500 hover:text-white"
          >
            <FcGoogle />
            Google
          </button> */}
        {/* </div> */}
      </div>
    </div>
  );
}
