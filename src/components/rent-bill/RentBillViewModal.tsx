'use client';

import ManagementModal from '@/components/property/ManagementModal';
import RentBillReceipt from '@/components/rent-bill/RentBillReceipt';
import type { RentBill } from '@/types/rentBill';
import { FaPrint } from 'react-icons/fa';

type Props = {
  bill: RentBill | null;
  onClose: () => void;
};

export default function RentBillViewModal({ bill, onClose }: Props) {
  return (
    <ManagementModal
      open={Boolean(bill)}
      title={bill ? `Receipt ${bill.receiptNumber}` : 'Rent receipt'}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      {bill && (
        <div className="bg-slate-800 p-3 sm:p-5">
          <RentBillReceipt bill={bill} />
          <div className="rent-bill-no-print mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <FaPrint /> Print / Download PDF
            </button>
          </div>
        </div>
      )}
    </ManagementModal>
  );
}
