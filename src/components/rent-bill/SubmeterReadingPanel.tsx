"use client";

import {
  getSubmeterContext,
  previewSubmeterReading,
  saveSubmeterReading,
} from "@/lib/rentApi";
import type { ElectricityCalculation } from "@/types/billing";
import type { SubmeterContext, SubmeterReading } from "@/types/submeter";
import { useEffect, useRef, useState } from "react";

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-50";
const today = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
};

export default function SubmeterReadingPanel({
  apartmentId,
  billingPeriod,
  onSaved,
}: {
  apartmentId: string;
  billingPeriod: string;
  onSaved: (reading: SubmeterReading) => void;
}) {
  const mounted = useRef(true);
  const [context, setContext] = useState<SubmeterContext | null>(null);
  const [previous, setPrevious] = useState("");
  const [current, setCurrent] = useState("");
  const [previousDate, setPreviousDate] = useState("");
  const [currentDate, setCurrentDate] = useState(today);
  const [meterCharge, setMeterCharge] = useState("0");
  const [useAverageRate, setUseAverageRate] = useState(false);
  const [averageRate, setAverageRate] = useState("");
  const [adjustment, setAdjustment] = useState("0");
  const [calculation, setCalculation] = useState<ElectricityCalculation | null>(
    null,
  );
  const [record, setRecord] = useState<SubmeterReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    getSubmeterContext(apartmentId, billingPeriod)
      .then((result) => {
        if (cancelled) return;
        setContext(result);
        const [year, month] = billingPeriod.split("-").map(Number);
        const expectedPreviousPeriod = new Date(Date.UTC(year, month - 2, 1))
          .toISOString()
          .slice(0, 7);
        setShowPrevious(
          result.existing
            ? !result.existing.previousReadingDate
            : result.previousPeriod !== expectedPreviousPeriod ||
                !result.previousReadingDate,
        );
        if (result.existing) {
          const reading = result.existing;
          setUseAverageRate(reading.useAverageRate ?? false);
          setAverageRate(
            reading.averageRate == null ? "" : String(reading.averageRate),
          );
          setRecord(reading);
          setCalculation(reading.calculation);
          setPrevious(String(reading.previousReading));
          setCurrent(String(reading.currentReading));
          setPreviousDate(reading.previousReadingDate || "");
          setCurrentDate(reading.currentReadingDate || "");
          setMeterCharge(String(reading.calculation.meterCharge));
          setAdjustment(String(reading.calculation.adjustmentAmount));
        } else {
          if (result.previousReading !== null)
            setPrevious(String(result.previousReading));
          setPreviousDate(result.previousReadingDate || "");
          if (
            result.previousMeterCharge !== null &&
            result.previousMeterCharge !== undefined
          )
            setMeterCharge(String(result.previousMeterCharge));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load submeter readings.",
          );
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [apartmentId, billingPeriod]);

  const edit = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCalculation(null);
    setError("");
    setMessage("");
  };
  const calculate = async (save: boolean) => {
    if (busy) return;
    if (
      [
        previous,
        current,
        meterCharge,
        adjustment,
        previousDate,
        currentDate,
      ].some((value) => value.trim() === "")
    ) {
      setError("Both readings and both reading dates are required.");
      return;
    }
    if (
      useAverageRate &&
      (!averageRate.trim() ||
        !Number.isFinite(Number(averageRate)) ||
        Number(averageRate) <= 0)
    ) {
      setError("Enter a valid positive average rate per unit.");
      return;
    }
    const payload = {
      useAverageRate,
      averageRate: useAverageRate ? Number(averageRate) : null,
      apartmentId,
      billingPeriod,
      previousReading: Number(previous),
      currentReading: Number(current),
      previousReadingDate: previousDate,
      currentReadingDate: currentDate,
      meterCharge: Number(meterCharge),
      adjustmentAmount: Number(adjustment),
      expectedRevision: record?.revision ?? (record ? 0 : null),
    };
    if (
      Object.values(payload).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )
    ) {
      setError("Enter valid numbers.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (save) {
        const result = await saveSubmeterReading(payload);
        if (!mounted.current) return;
        setRecord(result);
        setCalculation(result.calculation);
        setMessage(
          result.syncWarning ||
            `Reading saved. ${result.syncedRentBills ?? 0} existing due rent bill(s) updated automatically.`,
        );
        onSaved(result);
      } else {
        const result = await previewSubmeterReading(payload);
        if (mounted.current) setCalculation(result);
      }
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error
            ? err.message
            : "Failed to calculate submeter bill.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const disabled = busy || !context;
  const consumed =
    previous.trim() && current.trim()
      ? Number((Number(current) - Number(previous)).toFixed(2))
      : null;

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-5">
      <h2 className="text-lg font-bold text-amber-300">
        Submeter Bill · {billingPeriod}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Billing month আলাদা। Reading পরের মাসের ১ তারিখে হলেও selected month-এর
        bill হবে। Consumption = current − previous reading।
      </p>
      {context && (
        <p className="mt-2 text-xs text-slate-400">
          Meter: {context.meterNumber}
          {context.previousPeriod &&
            ` · Last saved month: ${context.previousPeriod} · Reading: ${context.previousReading}`}
        </p>
      )}
      {!context && !error && (
        <p role="status" className="mt-3 text-sm text-slate-400">
          Loading readings…
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Current reading date *
          <input
            aria-label="Current reading date"
            type="date"
            min={previousDate || undefined}
            max={today()}
            value={currentDate}
            disabled={disabled}
            onChange={(event) => edit(setCurrentDate, event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-slate-400">
          Current reading *
          <input
            aria-label="Current reading"
            type="number"
            min="0"
            step="0.01"
            value={current}
            disabled={disabled}
            onChange={(event) => edit(setCurrent, event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      {context && (
        <div className="mt-4 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">
              Previous reading: {previous || "Not set"} · Date:{" "}
              {previousDate || "Not set"}
            </p>
            <button
              type="button"
              onClick={() => setShowPrevious((value) => !value)}
              className="text-xs font-semibold text-indigo-300 underline"
            >
              {showPrevious
                ? "Hide previous reading fields"
                : "Add / update previous reading"}
            </button>
          </div>
          {showPrevious && (
            <>
              <p className="mt-3 text-xs leading-5 text-amber-200">
                আগের মাসের reading না থাকলে, অনেক পুরোনো হলে বা correction দরকার
                হলে এখানে সঠিক previous reading ও date দিন। আগের record বদলাবে
                না; এই মাসের baseline হিসেবেই save হবে।
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-slate-400">
                  Previous / opening reading *
                  <input
                    aria-label="Previous reading"
                    type="number"
                    min="0"
                    step="0.01"
                    value={previous}
                    disabled={disabled}
                    onChange={(event) => edit(setPrevious, event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Previous reading date *
                  <input
                    aria-label="Previous reading date"
                    type="date"
                    max={currentDate || today()}
                    value={previousDate}
                    disabled={disabled}
                    onChange={(event) =>
                      edit(setPreviousDate, event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}
      <div className="mt-4 rounded-xl border border-slate-700 p-4">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={useAverageRate}
            disabled={disabled}
            onChange={(event) => {
              setUseAverageRate(event.target.checked);
              setCalculation(null);
              setError("");
              setMessage("");
            }}
          />
          Use average rate (manual)
        </label>
        {useAverageRate && (
          <div className="mt-3">
            <label className="text-xs text-slate-400">
              Average rate per unit (BDT) *
              <input
                aria-label="Average rate per unit"
                type="number"
                min="0.0001"
                step="any"
                value={averageRate}
                disabled={disabled}
                onChange={(event) => edit(setAverageRate, event.target.value)}
                className={inputClass}
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Consumed units × আপনার দেওয়া rate। এই rate-এ VAT সহ মোট unit cost
              দিন; আলাদা VAT যোগ হবে না। Meter charge ও adjustment দিলে সেগুলো
              আলাদা যোগ হবে।
            </p>
          </div>
        )}
      </div>
      <details className="mt-4 text-xs text-slate-400">
        <summary className="cursor-pointer">Meter charge & adjustment</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label>
            Meter charge (BDT)
            <input
              type="number"
              min="0"
              step="0.01"
              value={meterCharge}
              disabled={disabled}
              onChange={(event) => edit(setMeterCharge, event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            Adjustment (BDT)
            <input
              type="number"
              step="0.01"
              value={adjustment}
              disabled={disabled}
              onChange={(event) => edit(setAdjustment, event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </details>
      {consumed !== null && (
        <p
          className={`mt-3 text-sm ${consumed < 0 ? "text-red-300" : "text-slate-300"}`}
        >
          Consumed units: {consumed}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {calculation && (
        <div className="mt-4 rounded-xl border border-slate-700 p-4 text-sm">
          <p className="font-semibold">
            {calculation.tariff.name} · VAT {calculation.tariff.vatPercentage}%
          </p>
          <div className="mt-3 space-y-2">
            {calculation.breakdown.map((row, index) => (
              <p key={index} className="flex flex-wrap justify-between gap-2">
                <span>
                  {row.label}: {row.unit} units × {row.rate}
                </span>
                <span>{money.format(row.amount)}</span>
              </p>
            ))}
          </div>
          <p className="mt-3 text-slate-400">
            Energy {money.format(calculation.energyCharge)} · Meter{" "}
            {money.format(calculation.meterCharge)} · VAT{" "}
            {money.format(calculation.vatAmount)} · Adjustment{" "}
            {money.format(calculation.adjustmentAmount)}
          </p>
          <p className="mt-3 text-lg font-bold text-emerald-300">
            Electricity total: {money.format(calculation.totalAmount)}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void calculate(false)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Processing…" : "Calculate"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void calculate(true)}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {record ? "Update apartment bill" : "Save apartment bill"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        এই apartment ও billing month-এর electricity amount rent bill-এ
        automatically যুক্ত হবে। Paid receipt-এর আগের হিসাব অপরিবর্তিত থাকবে।
      </p>
    </section>
  );
}
