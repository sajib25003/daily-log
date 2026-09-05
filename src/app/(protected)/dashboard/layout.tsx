"use client";
import UserNavbar from "@/components/Dashboard/UserNavbar/UserNavbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full">
      <UserNavbar />
      <div className="flex min-h-screen flex-col  mx-auto max-w-7xl ">
        <div>{children}</div>
      </div>
    </div>
  );
}
