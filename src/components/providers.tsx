"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
