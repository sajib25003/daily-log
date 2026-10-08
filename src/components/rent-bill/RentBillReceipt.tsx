'use client';

import type { RentBill } from '@/types/rentBill';
import Image from 'next/image';

const money = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
});

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

const formatMonth = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export default function RentBillReceipt({ bill }: { bill: RentBill }) {
  return (
    <article
      id="rent-bill-print-area"
      className="mx-auto w-full max-w-3xl bg-white p-6 text-slate-900 sm:p-9"
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-28 shrink-0">
            <Image
              src="/logo.png"
              alt="AHB Home Management System"
              fill
              sizes="112px"
              className="object-contain object-left"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Monthly Rent Receipt</h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatMonth(bill.billingPeriod)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex rounded-md border-2 px-4 py-1 text-sm font-black tracking-[0.2em] ${
              bill.status === 'paid'
                ? 'rotate-[-4deg] border-emerald-600 text-emerald-700'
                : bill.status === 'void'
                  ? 'border-slate-500 text-slate-500'
                  : 'rotate-[-4deg] border-red-600 text-red-700'
            }`}
          >
            {bill.status.toUpperCase()}
          </span>
          <p className="mt-3 text-xs text-slate-500">Receipt No.</p>
          <p className="font-mono text-sm font-semibold">
            {bill.receiptNumber}
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Billed to
          </p>
          <p className="mt-2 font-bold">{bill.tenantSnapshot.name}</p>
          <p className="mt-1 text-slate-600">{bill.tenantSnapshot.email}</p>
          {bill.tenantSnapshot.phone && (
            <p className="mt-1 text-slate-600">{bill.tenantSnapshot.phone}</p>
          )}
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Property
          </p>
          <p className="mt-2 font-bold">
            {bill.propertySnapshot.name} / {bill.apartmentSnapshot.apartmentNumber}
          </p>
          <p className="mt-1 text-slate-600">
            {bill.propertySnapshot.address}
          </p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-300">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bill.items.map((item) => (
              <tr key={`${item.key}-${item.label}`}>
                <td className="px-4 py-3">{item.label}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {money.format(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300">
            <tr>
              <td className="px-4 py-2 text-right text-slate-500">Subtotal</td>
              <td className="px-4 py-2 text-right font-semibold">
                {money.format(bill.subtotal)}
              </td>
            </tr>
            {bill.adjustmentAmount !== 0 && (
              <tr>
                <td className="px-4 py-2 text-right text-slate-500">
                  Adjustment
                  {bill.adjustmentNote ? ` — ${bill.adjustmentNote}` : ''}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {money.format(bill.adjustmentAmount)}
                </td>
              </tr>
            )}
            <tr className="bg-slate-900 text-white">
              <td className="px-4 py-3 text-right font-bold">Grand Total</td>
              <td className="px-4 py-3 text-right text-lg font-black">
                {money.format(bill.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        <Info label="Issued" value={formatDate(bill.issuedAt)} />
        <Info label="Due date" value={formatDate(bill.dueDate)} />
        <Info
          label="Paid date"
          value={bill.status === 'paid' ? formatDate(bill.paidAt) : 'Unpaid'}
        />
      </section>

      {(bill.note || bill.paymentNote) && (
        <section className="mt-6 rounded-lg bg-slate-100 p-4 text-sm">
          {bill.note && <p>{bill.note}</p>}
          {bill.paymentNote && (
            <p className={bill.note ? 'mt-2' : ''}>
              Payment note: {bill.paymentNote}
            </p>
          )}
        </section>
      )}

      <footer className="mt-9 flex items-end justify-between gap-6 border-t border-slate-300 pt-5 text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">
            {bill.ownerSnapshot.name}
          </p>
          {bill.ownerSnapshot.phone && <p>{bill.ownerSnapshot.phone}</p>}
        </div>
        <p className="text-right">
          Generated by AHB Home Management System
        </p>
      </footer>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
