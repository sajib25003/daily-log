'use client';

import ManagementModal from '@/components/property/ManagementModal';
import RentBillReceipt, {
  type ReceiptLanguage,
} from '@/components/rent-bill/RentBillReceipt';
import type { RentBill } from '@/types/rentBill';
import { useState } from 'react';
import { FaPrint } from 'react-icons/fa';

type Props = {
  bill: RentBill | null;
  onClose: () => void;
};

export default function RentBillViewModal({ bill, onClose }: Props) {
  const [language, setLanguage] = useState<ReceiptLanguage>('bn');

  return (
    <ManagementModal
      open={Boolean(bill)}
      title={bill ? `Receipt ${bill.receiptNumber}` : 'Rent receipt'}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      {bill && (
        <div className="bg-slate-800 p-3 sm:p-5">
          <div className="rent-bill-no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
            <div
              className="flex rounded-lg bg-slate-950 p-1"
              aria-label="Receipt language"
            >
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                aria-pressed={language === 'bn'}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  language === 'bn'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <FaPrint />
              {language === 'bn'
                ? 'প্রিন্ট / PDF ডাউনলোড'
                : 'Print / Download PDF'}
            </button>
          </div>

          <RentBillReceipt bill={bill} language={language} />
        </div>
      )}
    </ManagementModal>
  );
}
