'use client';

import RentBillEditModal from '@/components/rent-bill/RentBillEditModal';
import RentBillViewModal from '@/components/rent-bill/RentBillViewModal';
import { useAuth } from '@/context/AuthContext';
import { listActiveOwners, listProperties } from '@/lib/propertyApi';
import {
  getRentBill,
  listRentBills,
  updateRentBillStatus,
} from '@/lib/rentBillApi';
import type { Property, UserReference } from '@/types/property';
import { formatUserName, getDocumentId } from '@/types/property';
import type {
  PaymentMethod,
  RentBill,
  RentBillListData,
  RentBillStatus,
} from '@/types/rentBill';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaEye,
  FaFileInvoiceDollar,
  FaPlus,
  FaRedo,
  FaSpinner,
  FaSyncAlt,
  FaTimes,
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const money = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
});

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50';

const emptyResult: RentBillListData = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
  summary: {
    totalBills: 0,
    dueCount: 0,
    outstandingAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    voidCount: 0,
  },
};

const formatMonth = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export default function RentBillsPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const isManager = isSuperAdmin || user?.role === 'owner';
  const canAccess = isManager || user?.role === 'tenant';
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState<RentBillStatus | ''>('');
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState<RentBillListData>(emptyResult);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewingBill, setViewingBill] = useState<RentBill | null>(null);
  const [editingBill, setEditingBill] = useState<RentBill | null>(null);

  const yearOptions = useMemo(
    () => Array.from({ length: 9 }, (_item, index) => currentYear + 2 - index),
    [currentYear],
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;

    listActiveOwners()
      .then((result) => {
        if (!cancelled) setOwners(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load owners.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!user || !isManager || (isSuperAdmin && !ownerId)) return;
    let cancelled = false;

    listProperties(isSuperAdmin ? { ownerId } : undefined)
      .then((result) => {
        if (!cancelled) setProperties(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load properties.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isManager, isSuperAdmin, ownerId, user]);

  const loadBills = async (refresh = false) => {
    if (!user || !canAccess) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const result = await listRentBills({
        year,
        ownerId: isSuperAdmin ? ownerId || undefined : undefined,
        propertyId: isManager ? propertyId || undefined : undefined,
        status,
        page,
        limit,
      });
      setData(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load rent bills.',
      );
      setData(emptyResult);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (!user || !canAccess) return;

    listRentBills({
      year,
      ownerId: isSuperAdmin ? ownerId || undefined : undefined,
      propertyId: isManager ? propertyId || undefined : undefined,
      status,
      page,
      limit,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError('');
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load rent bills.',
          );
          setData(emptyResult);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canAccess, isManager, isSuperAdmin, limit, ownerId, page, propertyId, status, user, year]);

  const openBill = async (billId: string) => {
    try {
      setError('');
      setViewingBill(await getRentBill(billId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load the receipt.',
      );
    }
  };

  const replaceBill = (updated: RentBill) => {
    setData((current) => ({
      ...current,
      items: current.items.map((bill) =>
        bill._id === updated._id ? updated : bill,
      ),
    }));
  };

  const showSuccess = (title: string) => {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 1700,
      background: '#0f172a',
      color: '#e2e8f0',
    });
  };

  const markPaid = async (bill: RentBill) => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await Swal.fire({
      title: 'Mark bill as paid?',
      html: `
        <div style="text-align:left">
          <label style="display:block;margin-bottom:12px;color:#cbd5e1;font-size:13px">Paid date
            <input id="rent-paid-date" type="date" value="${today}" class="swal2-input" style="width:100%;margin:6px 0 0" />
          </label>
          <label style="display:block;margin-bottom:12px;color:#cbd5e1;font-size:13px">Payment method
            <select id="rent-payment-method" class="swal2-select" style="width:100%;margin:6px 0 0">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mobileBanking">Mobile banking</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label style="display:block;color:#cbd5e1;font-size:13px">Payment note
            <textarea id="rent-payment-note" class="swal2-textarea" maxlength="1000" style="width:100%;margin:6px 0 0"></textarea>
          </label>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Mark paid',
      cancelButtonText: 'Cancel',
      heightAuto: false,
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#334155',
      preConfirm: () => {
        const paidAt = (
          document.getElementById('rent-paid-date') as HTMLInputElement | null
        )?.value;
        const paymentMethod = (
          document.getElementById(
            'rent-payment-method',
          ) as HTMLSelectElement | null
        )?.value as PaymentMethod | undefined;
        const paymentNote = (
          document.getElementById(
            'rent-payment-note',
          ) as HTMLTextAreaElement | null
        )?.value;

        if (!paidAt) {
          Swal.showValidationMessage('Paid date is required.');
          return false;
        }

        return { paidAt, paymentMethod, paymentNote };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const updated = await updateRentBillStatus(bill._id, {
        status: 'paid',
        paidAt: result.value.paidAt,
        paymentMethod: result.value.paymentMethod,
        paymentNote: result.value.paymentNote || null,
      });
      replaceBill(updated);
      await loadBills(true);
      showSuccess('Bill marked as paid.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update payment status.',
      );
    }
  };

  const updateWithReason = async (
    bill: RentBill,
    nextStatus: 'due' | 'void',
  ) => {
    const result = await Swal.fire({
      title: nextStatus === 'void' ? 'Void this bill?' : 'Reopen as due?',
      input: 'textarea',
      inputLabel: 'Reason',
      inputPlaceholder: 'Enter the reason...',
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: nextStatus === 'void' ? 'Void bill' : 'Reopen bill',
      heightAuto: false,
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: nextStatus === 'void' ? '#dc2626' : '#d97706',
      cancelButtonColor: '#334155',
      inputValidator: (value) => (!value.trim() ? 'A reason is required.' : undefined),
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const updated = await updateRentBillStatus(bill._id, {
        status: nextStatus,
        reason: result.value.trim(),
      });
      replaceBill(updated);
      await loadBills(true);
      showSuccess(nextStatus === 'void' ? 'Bill voided.' : 'Bill reopened.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update bill status.',
      );
    }
  };

  if (isAuthLoading) return <PageLoader />;

  if (!user || !canAccess) return <AccessDenied />;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                {user.role === 'tenant' ? 'Tenant portal' : 'Rent management'}
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {user.role === 'tenant' ? 'My Monthly Bills' : 'Monthly Rent Bills'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {user.role === 'tenant'
                  ? 'View your issued monthly bills, payment status and downloadable receipts.'
                  : 'Generate monthly bills, record payments and keep an auditable receipt history.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadBills(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              {isManager && (
                <Link
                  href="/dashboard/rent-bills/generate"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500"
                >
                  <FaPlus /> Generate bill
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Bills" value={String(data.summary.totalBills)} tone="indigo" />
          <SummaryCard label="Outstanding" value={money.format(data.summary.outstandingAmount)} detail={`${data.summary.dueCount} due`} tone="amber" />
          <SummaryCard label="Paid" value={money.format(data.summary.paidAmount)} detail={`${data.summary.paidCount} paid`} tone="emerald" />
        </section>

        <section className="mt-5 grid gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Year</span>
            <select value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }} className={inputClassName}>
              {yearOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value as RentBillStatus | ''); setPage(1); }} className={inputClassName}>
              <option value="">All statuses</option>
              <option value="due">Due</option>
              <option value="paid">Paid</option>
              {isManager && <option value="void">Void</option>}
            </select>
          </label>

          {isSuperAdmin && (
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Owner</span>
              <select value={ownerId} onChange={(event) => { setOwnerId(event.target.value); setProperties([]); setPropertyId(''); setPage(1); }} className={inputClassName}>
                <option value="">All owners</option>
                {owners.map((owner) => <option key={getDocumentId(owner)} value={getDocumentId(owner)}>{formatUserName(owner.name)}</option>)}
              </select>
            </label>
          )}

          {isManager && (
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Property</span>
              <select value={propertyId} disabled={isSuperAdmin && !ownerId} onChange={(event) => { setPropertyId(event.target.value); setPage(1); }} className={inputClassName}>
                <option value="">All properties</option>
                {properties.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
              </select>
            </label>
          )}
        </section>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><FaFileInvoiceDollar /></span>
              <h2 className="font-bold">Rent bill history</h2>
            </div>
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} aria-label="Items per page" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center"><FaSpinner className="animate-spin text-3xl text-indigo-400" /></div>
          ) : data.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FaFileInvoiceDollar className="mx-auto text-4xl text-slate-700" />
              <h3 className="mt-4 font-bold text-slate-200">No rent bills found</h3>
              <p className="mt-2 text-sm text-slate-500">No bill has been generated for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Month</th>
                    {isManager && <th className="px-5 py-3">Tenant</th>}
                    <th className="px-5 py-3">Property / Apartment</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Due / Paid</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.items.map((bill) => (
                    <tr key={bill._id} className="transition hover:bg-slate-800/40">
                      <td className="px-5 py-4"><p className="font-semibold text-slate-100">{formatMonth(bill.billingPeriod)}</p><p className="mt-1 font-mono text-xs text-slate-500">{bill.receiptNumber}</p></td>
                      {isManager && <td className="px-5 py-4"><p className="font-medium text-slate-200">{bill.tenantSnapshot.name}</p><p className="mt-1 text-xs text-slate-500">{bill.tenantSnapshot.phone || bill.tenantSnapshot.email}</p></td>}
                      <td className="px-5 py-4"><p className="text-slate-200">{bill.propertySnapshot.name} / {bill.apartmentSnapshot.apartmentNumber}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{bill.propertySnapshot.address}</p></td>
                      <td className="px-5 py-4 font-bold text-slate-100">{money.format(bill.totalAmount)}</td>
                      <td className="px-5 py-4"><StatusBadge status={bill.status} /></td>
                      <td className="px-5 py-4 text-slate-400">{bill.status === 'paid' ? formatDate(bill.paidAt) : formatDate(bill.dueDate)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <ActionButton label="View / download" onClick={() => void openBill(bill._id)} icon={<FaEye />} />
                          {isManager && bill.status === 'due' && <ActionButton label="Edit bill" onClick={() => setEditingBill(bill)} icon={<FaEdit />} />}
                          {isManager && bill.status === 'due' && <ActionButton label="Mark paid" onClick={() => void markPaid(bill)} icon={<FaCheck />} tone="emerald" />}
                          {isManager && bill.status === 'paid' && <ActionButton label="Reopen as due" onClick={() => void updateWithReason(bill, 'due')} icon={<FaRedo />} tone="amber" />}
                          {isManager && bill.status !== 'void' && <ActionButton label="Void bill" onClick={() => void updateWithReason(bill, 'void')} icon={<FaTimes />} tone="red" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-700/60 px-5 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {data.items.length} of {data.meta.total} bills</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40"><FaChevronLeft /></button>
              <span className="px-2">Page {data.meta.page} of {data.meta.totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(data.meta.totalPages, current + 1))} disabled={page >= data.meta.totalPages} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40"><FaChevronRight /></button>
            </div>
          </div>
        </section>
      </div>

      <RentBillViewModal bill={viewingBill} onClose={() => setViewingBill(null)} />

      {editingBill && (
        <RentBillEditModal
          key={editingBill._id}
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onSaved={(updated) => {
            replaceBill(updated);
            setEditingBill(null);
            void loadBills(true);
            showSuccess('Rent bill updated.');
          }}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: RentBillStatus }) {
  const style = status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' : status === 'void' ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/15 text-amber-300';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${style}`}>{status}</span>;
}

function ActionButton({ label, onClick, icon, tone = 'slate' }: { label: string; onClick: () => void; icon: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'red' }) {
  const style = tone === 'emerald' ? 'border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/20 text-amber-300 hover:bg-amber-500/10' : tone === 'red' ? 'border-red-500/20 text-red-300 hover:bg-red-500/10' : 'border-slate-700 text-slate-300 hover:bg-slate-700';
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-slate-800 ${style}`}>{icon}</button>;
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: 'indigo' | 'amber' | 'emerald' }) {
  const style = tone === 'emerald' ? 'border-emerald-500/20 text-emerald-300' : tone === 'amber' ? 'border-amber-500/20 text-amber-300' : 'border-indigo-500/20 text-indigo-300';
  return <div className={`rounded-2xl border bg-slate-900/70 p-5 ${style}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}

function PageLoader() {
  return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-3xl text-indigo-400" /></div>;
}

function AccessDenied() {
  return <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100"><div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-slate-400">Rent bills are available to super administrators, owners and tenants.</p></div></main>;
}
