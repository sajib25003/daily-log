"use client";
import UserNavbar from "@/components/Dashboard/UserNavbar/UserNavbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full">
      <UserNavbar
        onSectionChange={(section) => {
          console.log("Selected section:", section);
        }}
        onCreateUser={() => {
          console.log("Open create-user modal");
        }}
      />
      <div className="flex min-h-screen flex-col  mx-auto max-w-7xl ">
        <div>{children}</div>
      </div>
    </div>
  );
}
