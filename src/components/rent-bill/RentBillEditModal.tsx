'use client';

import ManagementModal from '@/components/property/ManagementModal';
import RentBillFormFields from '@/components/rent-bill/RentBillFormFields';
import { updateRentBill } from '@/lib/rentBillApi';
import type { RentBill, RentBillFormPayload } from '@/types/rentBill';
import { FormEvent, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

type Props = {
  bill: RentBill;
  onClose: () => void;
  onSaved: (bill: RentBill) => void;
};

const toDateInput = (value?: string | null) => value?.slice(0, 10) ?? '';

export default function RentBillEditModal({ bill, onClose, onSaved }: Props) {
  const [form, setForm] = useState<RentBillFormPayload>({
    items: bill.items.map((item) => ({
      categoryId: item.categoryId ?? null,
      key: item.key,
      label: item.label,
      amount: String(item.amount),
      type: item.type,
    })),
    adjustmentAmount: String(bill.adjustmentAmount),
    adjustmentNote: bill.adjustmentNote ?? '',
    dueDate: toDateInput(bill.dueDate),
    note: bill.note ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    if (form.items.some((item) => item.amount.trim() === '')) {
      setError('Enter an amount for every charge.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updated = await updateRentBill(bill._id, form);
      onSaved(updated);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update the rent bill.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ManagementModal
      open
      title={`Edit ${bill.receiptNumber}`}
      onClose={onClose}
      disableClose={isSaving}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={submit} className="space-y-5 p-5">
        <RentBillFormFields
          lockElectricity={Boolean(bill.submeterReading)}
          form={form}
          setForm={setForm}
          disabled={isSaving}
        />

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving && <FaSpinner className="animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </ManagementModal>
  );
}
