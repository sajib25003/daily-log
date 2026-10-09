'use client';

import {
  getSubmeterContext,
  previewSubmeterReading,
  saveSubmeterReading,
} from '@/lib/rentApi';
import type { ElectricityCalculation } from '@/types/billing';
import type { SubmeterContext, SubmeterReading } from '@/types/submeter';
import { useEffect, useRef, useState } from 'react';

const money = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
});
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-50';

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
  const [previous, setPrevious] = useState('');
  const [current, setCurrent] = useState('');
  const [meterCharge, setMeterCharge] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [calculation, setCalculation] = useState<ElectricityCalculation | null>(
    null,
  );
  const [saved, setSaved] = useState<SubmeterReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    getSubmeterContext(apartmentId, billingPeriod)
      .then((result) => {
        if (cancelled) return;
        setContext(result);
        if (result.existing) {
          setSaved(result.existing);
          setCalculation(result.existing.calculation);
          setPrevious(String(result.existing.previousReading));
          setCurrent(String(result.existing.currentReading));
          setMeterCharge(String(result.existing.calculation.meterCharge));
          setAdjustment(String(result.existing.calculation.adjustmentAmount));
        } else if (
          result.previousReading !== null
        ) {
          setPrevious(String(result.previousReading));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load submeter readings.',
          );
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [apartmentId, billingPeriod]);

  const hasPrevious =
    context?.previousReading !== null && context?.previousReading !== undefined;
  const disabled =
    busy || Boolean(saved) || Boolean(context?.locked) || !context;
  const consumed =
    previous.trim() && current.trim()
      ? Number((Number(current) - Number(previous)).toFixed(2))
      : null;

  const calculate = async (save: boolean) => {
    if (busy) return;
    if (
      previous.trim() === '' ||
      current.trim() === '' ||
      meterCharge.trim() === '' ||
      adjustment.trim() === ''
    ) {
      setError('Enter both readings, meter charge and adjustment.');
      return;
    }
    const payload = {
      apartmentId,
      billingPeriod,
      previousReading: Number(previous),
      currentReading: Number(current),
      meterCharge: Number(meterCharge),
      adjustmentAmount: Number(adjustment),
    };
    if (
      Object.values(payload).some(
        (value) => typeof value === 'number' && !Number.isFinite(value),
      )
    ) {
      setError('Enter valid numbers.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (save) {
        const result = await saveSubmeterReading(payload);
        if (!mounted.current) return;
        setSaved(result);
        setCalculation(result.calculation);
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
            : 'Failed to calculate submeter bill.',
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const edit = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCalculation(null);
    setError('');
  };

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-5">
      <h2 className="text-lg font-bold text-amber-300">
        Submeter Reading · {billingPeriod}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        বর্তমান reading − আগের reading = consumed units। Property provider-এর এই
        billing month-এর শুরুতে কার্যকর tariff দিয়ে হিসাব হবে। Meter charge
        আলাদা করে দিন; default 0।
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
          Loading previous reading…
        </p>
      )}
      {context && !hasPrevious && !saved && (
        <p className="mt-3 text-sm text-amber-200">
          এই meter-এর প্রথম reading হলে opening reading দিন। Tenant বদলালেও
          meter reading চলমান থাকবে।
        </p>
      )}
      {context?.previousPeriod &&
        hasPrevious &&
        context.previousPeriod !==
          new Date(
            Date.UTC(
              Number(billingPeriod.slice(0, 4)),
              Number(billingPeriod.slice(5, 7)) - 2,
              1,
            ),
          )
            .toISOString()
            .slice(0, 7) && (
          <p className="mt-3 text-sm text-amber-200">
            মাঝে reading নেই। এই calculation-এ শেষ saved reading থেকে পুরো
            consumption ধরা হবে; missed month আলাদা bill করতে হলে আগে সেই মাসের
            reading দিন।
          </p>
        )}
      {context?.locked && !saved && (
        <p role="alert" className="mt-3 text-sm text-amber-200">
          এই মাসের rent bill বা পরের মাসের reading আছে। এখানে নতুন reading save
          করা যাবে না।
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <label className="text-xs text-slate-400">
          Previous / opening reading
          <input
            aria-label="Previous reading"
            type="number"
            min="0"
            step="0.01"
            value={previous}
            disabled={disabled || Boolean(hasPrevious)}
            onChange={(event) => edit(setPrevious, event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-slate-400">
          Current reading
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
        <label className="text-xs text-slate-400">
          Meter charge (BDT)
          <input
            aria-label="Meter charge"
            type="number"
            min="0"
            step="0.01"
            value={meterCharge}
            disabled={disabled}
            onChange={(event) => edit(setMeterCharge, event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-slate-400">
          Adjustment (BDT)
          <input
            aria-label="Electricity adjustment"
            type="number"
            step="0.01"
            value={adjustment}
            disabled={disabled}
            onChange={(event) => edit(setAdjustment, event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      {consumed !== null && (
        <p
          className={`mt-3 text-sm ${consumed < 0 ? 'text-red-300' : 'text-slate-300'}`}
        >
          Consumed units: {consumed}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
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
            Energy {money.format(calculation.energyCharge)} · Meter{' '}
            {money.format(calculation.meterCharge)} · VAT{' '}
            {money.format(calculation.vatAmount)} · Adjustment{' '}
            {money.format(calculation.adjustmentAmount)}
          </p>
          <p className="mt-3 text-lg font-bold text-emerald-300">
            Electricity total: {money.format(calculation.totalAmount)}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {saved ? (
          <>
            <p role="status" className="text-sm text-emerald-300">
              Apartment reading saved. এই হিসাব rent bill ও receipt-এ থাকবে।
            </p>
            <button
              type="button"
              onClick={() => onSaved(saved)}
              className="rounded-xl border border-emerald-600 px-4 py-2 text-sm text-emerald-300"
            >
              Apply saved amount
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void calculate(false)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Processing…' : 'Calculate'}
            </button>
            <button
              type="button"
              disabled={disabled || !calculation}
              onClick={() => void calculate(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Save apartment reading
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Save করার পর reading বদলানো যাবে না। Bill-এ প্রয়োজন হলে adjustment দিন।
        এটি submeter-এর consumption অনুযায়ী হিসাব; main meter bill ভাগ করার
        হিসাব নয়।
      </p>
    </section>
  );
}
