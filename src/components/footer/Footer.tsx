"use client";
import { usePathname } from "next/navigation";
import React from "react";

const Footer = () => {
  const pathname = usePathname();
  return (
    <footer
      className={` border-t border-slate-200 bg-white ${pathname === "/" ? "hidden" : ""}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-5 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} AHB — Receipt Management System
      </div>
    </footer>
  );
};

export default Footer;
