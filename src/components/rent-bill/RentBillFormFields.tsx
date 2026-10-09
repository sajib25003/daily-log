'use client';

import type { RentBillFormPayload } from '@/types/rentBill';
import { FaPlus, FaTrash } from 'react-icons/fa';

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60';

type Props = {
  form: RentBillFormPayload;
  setForm: React.Dispatch<React.SetStateAction<RentBillFormPayload>>;
  disabled?: boolean;
  lockElectricity?: boolean;
};

export default function RentBillFormFields({
  form,
  setForm,
  disabled = false,
  lockElectricity = false,
}: Props) {
  const subtotal = form.items.reduce((total, item) => {
    const amount = Number(item.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const adjustment = Number(form.adjustmentAmount || 0);
  const total = subtotal + (Number.isFinite(adjustment) ? adjustment : 0);

  const addCustomItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          categoryId: null,
          key: `CUSTOM_${Date.now()}`,
          label: '',
          amount: '',
          type: 'custom',
        },
      ],
    }));
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-700/70">
        <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-950/40 px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-100">Charge details</h2>
            <p className="mt-1 text-xs text-slate-500">
              Leave no generated charge blank before submitting.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomItem}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <FaPlus /> Custom charge
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {form.items.map((item, index) => (
            <div
              key={item.key}
              className="grid gap-3 bg-slate-900/50 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
            >
              <label>
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  Charge
                </span>
                <input
                  value={item.label}
                  readOnly={item.type !== 'custom'}
                  required
                  maxLength={120}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      items: current.items.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, label: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                  disabled={disabled}
                  placeholder="Charge name"
                  className={inputClassName}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  Amount (BDT)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={item.amount}
                  readOnly={lockElectricity && item.key === 'ELECTRICITY'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      items: current.items.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, amount: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                  disabled={disabled}
                  title={lockElectricity && item.key === 'ELECTRICITY' ? 'Calculated from the saved submeter reading. Use adjustment for corrections.' : undefined}
                  placeholder={item.type === 'variable' ? 'Enter this month' : '0'}
                  className={inputClassName}
                />
              </label>

              {item.type === 'custom' ? (
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: current.items.filter(
                        (_entry, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                  disabled={disabled}
                  aria-label={`Remove ${item.label || 'custom charge'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <FaTrash />
                </button>
              ) : (
                <span className="hidden h-10 w-10 sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-400">
            Adjustment (+/- BDT)
          </span>
          <input
            type="number"
            step="0.01"
            value={form.adjustmentAmount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                adjustmentAmount: event.target.value,
              }))
            }
            disabled={disabled}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-400">
            Adjustment reason
          </span>
          <input
            value={form.adjustmentNote}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                adjustmentNote: event.target.value,
              }))
            }
            disabled={disabled}
            maxLength={1000}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-400">
            Due date
          </span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                dueDate: event.target.value,
              }))
            }
            disabled={disabled}
            className={inputClassName}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">
            Bill note
          </span>
          <textarea
            rows={3}
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
            disabled={disabled}
            maxLength={2000}
            className={inputClassName}
          />
        </label>
      </section>

      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Subtotal</span>
          <span>৳{subtotal.toLocaleString('en-BD')}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-400">
          <span>Adjustment</span>
          <span>৳{(Number.isFinite(adjustment) ? adjustment : 0).toLocaleString('en-BD')}</span>
        </div>
        <div className="mt-4 flex justify-between border-t border-emerald-500/20 pt-4 text-lg font-black text-emerald-300">
          <span>Grand total</span>
          <span>৳{total.toLocaleString('en-BD')}</span>
        </div>
      </section>
    </div>
  );
}
