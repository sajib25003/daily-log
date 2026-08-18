"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // signIn("credentials", {
    //   username: "testuser",
    //   password: "testpassword",
    //   callbackUrl: "/dashboard",
    // });
    router.push("/dashboard");
  };
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl shadow-2xl p-8">
        {/* Logo */}

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
            D
          </div>

          <h1 className="text-3xl font-bold text-slate-100">Daily Log</h1>

          <p className="mt-2 text-sm text-slate-400">
            Record every meaningful moment.
          </p>
        </div>

        {/* Form */}

        <form className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Username
            </label>

            <input
              type="text"
              placeholder="Enter username"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Login
          </button>
        </form>

        {/* Divider */}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700"></div>
          <span className="text-xs uppercase tracking-widest text-slate-500">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-slate-700"></div>
        </div>

        {/* Social */}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => signIn("facebook")}
            className="rounded-xl border border-slate-700 bg-slate-800 py-3 text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            Facebook
          </button>

          <button
            onClick={() => signIn("google")}
            className="rounded-xl border border-slate-700 bg-slate-800 py-3 text-slate-300 transition hover:border-red-500 hover:text-white"
          >
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
