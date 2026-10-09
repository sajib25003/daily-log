"use client";
import { listSubmeterReadings } from "@/lib/rentApi";
import type { SubmeterReading } from "@/types/submeter";
import { useEffect, useState } from "react";
const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const date = (value?: string) =>
  value ? value.split("-").reverse().join(".") : "";

export default function SubmeterHistory({
  apartmentId,
  year,
  refresh,
  onSelect,
}: {
  apartmentId: string;
  year: number;
  refresh: number;
  onSelect: (period: string) => void;
}) {
  const [state, setState] = useState<{
    key: string;
    items: SubmeterReading[];
    error?: string;
  } | null>(null);
  const key = `${apartmentId}:${year}:${refresh}`;
  useEffect(() => {
    let cancelled = false;
    listSubmeterReadings(apartmentId, year)
      .then((items) => {
        if (!cancelled) setState({ key, items });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            key,
            items: [],
            error:
              error instanceof Error
                ? error.message
                : "Failed to load reading history.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [apartmentId, year, key]);
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
      <h2 className="border-b border-slate-700 p-4 font-semibold">
        Monthly reading history · {year}
      </h2>
      {state?.key !== key ? (
        <p role="status" className="p-4 text-sm text-slate-400">
          Loading history…
        </p>
      ) : state.error ? (
        <p role="alert" className="p-4 text-sm text-red-300">
          {state.error}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                {[
                  "Month",
                  "Current reading",
                  "Current date",
                  "Previous reading",
                  "Previous date",
                  "Units",
                  "Bill amount",
                  "Average bill / unit",
                  "Rent bill status",
                ].map((label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, index) => {
                const period = `${year}-${String(index + 1).padStart(2, "0")}`;
                const reading = state.items.find(
                  (item) => item.billingPeriod === period,
                );
                return (
                  <tr key={period} className="border-t border-slate-800">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => onSelect(period)}
                        className="font-semibold text-indigo-300 underline underline-offset-4"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          month: "long",
                          timeZone: "UTC",
                        }).format(new Date(Date.UTC(year, index, 1)))}
                      </button>
                    </td>
                    <td className="p-3">{reading?.currentReading ?? ""}</td>
                    <td className="p-3">{date(reading?.currentReadingDate)}</td>
                    <td className="p-3">{reading?.previousReading ?? ""}</td>
                    <td className="p-3">
                      {date(reading?.previousReadingDate)}
                    </td>
                    <td className="p-3">{reading?.consumedUnit ?? ""}</td>
                    <td className="p-3 font-semibold text-emerald-300">
                      {reading
                        ? money.format(reading.calculation.totalAmount)
                        : ""}
                    </td>
                    <td className="p-3">{reading && reading.consumedUnit > 0 ? `৳${(reading.calculation.totalAmount / reading.consumedUnit).toFixed(4)}` : reading ? "—" : ""}</td>
                    <td className="p-3 capitalize">
                      {reading?.status === "notBilled"
                        ? "Not billed"
                        : reading?.status || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
