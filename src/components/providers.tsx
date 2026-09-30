"use client";

import { AuthProvider } from "@/context/AuthContext";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthProvider>{children}</AuthProvider>;
}
