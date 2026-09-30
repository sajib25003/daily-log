"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Login page-এ footer দেখানো হবে না
  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="border-t border-slate-700/60 bg-slate-950 text-slate-400 relative">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
        {/* Brand information */}
        <div className="relative h-12 w-44 shrink-0">
          <Image
            src="/logo.png"
            alt="AHB Logo"
            fill
            sizes="176px"
            unoptimized
            className="object-contain object-center brightness-0 invert md:object-left"
          />
        </div>

        {/* Copyright */}
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <p className="text-xs text-slate-500">
            © {currentYear}{" "}
            <a
              href="https://ashikhassan.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-400 transition hover:text-indigo-300 hover:underline"
            >
              AHB
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
