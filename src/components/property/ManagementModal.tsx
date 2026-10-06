"use client";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { FaTimes } from "react-icons/fa";

type ManagementModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  disableClose?: boolean;
  maxWidthClass?: string;
};

export default function ManagementModal({
  open,
  title,
  children,
  onClose,
  disableClose = false,
  maxWidthClass = "max-w-lg",
}: ManagementModalProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disableClose) onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [disableClose, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disableClose) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[calc(100dvh-2rem)] w-full ${maxWidthClass} overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Close modal"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTimes />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
