'use client';

import ManagementModal from '@/components/property/ManagementModal';
import { useAuth } from '@/context/AuthContext';
import { listActiveOwners, listApartments, listProperties } from '@/lib/propertyApi';
import {
  createLedgerExpense,
  createLedgerIncome,
  deleteLedgerExpense,
  deleteLedgerIncome,
  getLedgerOverview,
  listExpenseCategories,
  prepareLedgerMonth,
  updateLedgerExpense,
  updateLedgerIncome,
} from '@/lib/propertyLedgerApi';
import type { Apartment, Property, UserReference } from '@/types/property';
import { formatUserName, getDocumentId } from '@/types/property';
import type { ExpenseCategory, LedgerOverview, PropertyExpense, PropertyIncome } from '@/types/propertyLedger';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FaArrowTrendDown,
  FaArrowTrendUp,
  FaChartColumn,
  FaFileInvoiceDollar,
  FaLayerGroup,
  FaPlus,
  FaPenToSquare,
  FaSpinner,
  FaTrash,
  FaWallet,
} from 'react-icons/fa6';
import Swal from 'sweetalert2';

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const money = (value: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(value);
const idOf = (value: string | { _id: string } | null | undefined) => (typeof value === 'string' ? value : value?._id ?? '');
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400';

type EntryModal = { kind: 'expense'; item?: PropertyExpense } | { kind: 'income'; item?: PropertyIncome } | null;

export default function PropertyLedgerPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [period, setPeriod] = useState(currentPeriod);
  const [overview, setOverview] = useState<LedgerOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<EntryModal>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [entryForm, setEntryForm] = useState({ title: '', amount: '', categoryId: '', apartmentId: '', date: '', status: 'pending', paymentMethod: '', note: '' });
  const effectiveOwnerId = isSuperAdmin ? ownerId : (user?.id ?? '');

  useEffect(() => {
    if (!user || !canManage || !isSuperAdmin) return;
    let cancelled = false;
    listActiveOwners()
      .then((items) => {
        if (cancelled) return;
        setOwners(items);
        setOwnerId((value) => value || getDocumentId(items[0]));
        if (!items.length) setIsLoading(false);
      })
      .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : 'Failed to load owners.'));
    return () => { cancelled = true; };
  }, [canManage, isSuperAdmin, user]);

  useEffect(() => {
    if (!canManage || !effectiveOwnerId) return;
    let cancelled = false;
    listProperties(isSuperAdmin ? { ownerId: effectiveOwnerId } : undefined)
      .then((items) => {
        if (cancelled) return;
        setProperties(items);
        setPropertyId((value) => items.some((item) => item._id === value) ? value : items[0]?._id ?? '');
        if (!items.length) { setOverview(null); setIsLoading(false); }
      })
      .catch((reason: unknown) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : 'Failed to load properties.'); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [canManage, effectiveOwnerId, isSuperAdmin]);

  const loadOverview = useCallback(async () => {
    if (!propertyId || !effectiveOwnerId) return;
    const [ledger, apartmentData, categoryData] = await Promise.all([
      getLedgerOverview({ ownerId: isSuperAdmin ? effectiveOwnerId : undefined, propertyId, period }),
      listApartments(propertyId),
      listExpenseCategories(isSuperAdmin ? effectiveOwnerId : undefined),
    ]);
    setOverview(ledger);
    setApartments(apartmentData.apartments);
    setCategories(categoryData);
  }, [effectiveOwnerId, isSuperAdmin, period, propertyId]);

  useEffect(() => {
    if (!propertyId || !effectiveOwnerId) return;
    let cancelled = false;
    Promise.all([
      getLedgerOverview({ ownerId: isSuperAdmin ? effectiveOwnerId : undefined, propertyId, period }),
      listApartments(propertyId),
      listExpenseCategories(isSuperAdmin ? effectiveOwnerId : undefined),
    ])
      .then(([ledger, apartmentData, categoryData]) => {
        if (cancelled) return;
        setOverview(ledger); setApartments(apartmentData.apartments); setCategories(categoryData); setError('');
      })
      .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : 'Failed to load property ledger.'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [effectiveOwnerId, isSuperAdmin, period, propertyId]);

  const selectedProperty = useMemo(() => properties.find((item) => item._id === propertyId), [properties, propertyId]);

  const openEntry = (kind: 'expense' | 'income', item?: PropertyExpense | PropertyIncome) => {
    setModal(kind === 'expense' ? { kind, item: item as PropertyExpense | undefined } : { kind, item: item as PropertyIncome | undefined });
    setModalError('');
    setEntryForm({
      title: item?.title ?? '',
      amount: item?.amount == null ? '' : String(item.amount),
      categoryId: kind === 'expense' && item ? idOf((item as PropertyExpense).categoryId) : categories[0]?._id ?? '',
      apartmentId: idOf(item?.apartmentId),
      date: kind === 'expense' ? ((item as PropertyExpense | undefined)?.expenseDate?.slice(0, 10) ?? '') : ((item as PropertyIncome | undefined)?.receivedDate?.slice(0, 10) ?? ''),
      status: item?.status ?? (kind === 'income' ? 'received' : 'pending'),
      paymentMethod: item?.paymentMethod ?? '',
      note: item?.note ?? '',
    });
  };

  const submitEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal || isSaving) return;
    setIsSaving(true); setModalError('');
    try {
      if (modal.kind === 'expense') {
        const payload = {
          ownerId: isSuperAdmin ? ownerId : undefined,
          propertyId,
          apartmentId: entryForm.apartmentId || null,
          categoryId: entryForm.categoryId,
          period,
          expenseDate: entryForm.date || null,
          title: entryForm.title,
          amount: entryForm.amount === '' ? null : Number(entryForm.amount),
          status: entryForm.status as 'pending' | 'paid' | 'skipped',
          paymentMethod: entryForm.paymentMethod || null,
          note: entryForm.note || null,
        };
        if (modal.item) await updateLedgerExpense(modal.item._id, payload);
        else await createLedgerExpense(payload);
      } else {
        const payload = {
          ownerId: isSuperAdmin ? ownerId : undefined,
          propertyId,
          apartmentId: entryForm.apartmentId || null,
          period,
          receivedDate: entryForm.date || null,
          title: entryForm.title,
          amount: Number(entryForm.amount),
          status: entryForm.status as 'pending' | 'received',
          paymentMethod: entryForm.paymentMethod || null,
          note: entryForm.note || null,
        };
        if (modal.item) await updateLedgerIncome(modal.item._id, payload);
        else await createLedgerIncome(payload);
      }
      setModal(null); await loadOverview();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : 'Failed to save ledger entry.');
    } finally { setIsSaving(false); }
  };

  const prepare = async () => {
    setIsPreparing(true); setError('');
    try {
      await prepareLedgerMonth({ ownerId: isSuperAdmin ? ownerId : undefined, propertyId, period });
      await loadOverview();
      await Swal.fire({ icon: 'success', title: 'Month prepared', text: 'Applicable recurring expenses are ready for review.', background: '#0f172a', color: '#e2e8f0', confirmButtonColor: '#4f46e5' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to prepare month.'); }
    finally { setIsPreparing(false); }
  };

  const removeEntry = async (kind: 'expense' | 'income', id: string) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Remove this entry?', text: kind === 'expense' ? 'This only removes it from this month. A recurring template remains available.' : 'This income entry will be removed.', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#dc2626', background: '#0f172a', color: '#e2e8f0' });
    if (!result.isConfirmed) return;
    try { if (kind === 'expense') await deleteLedgerExpense(id); else await deleteLedgerIncome(id); await loadOverview(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to remove entry.'); }
  };

  if (isAuthLoading || (canManage && isLoading && !overview && properties.length > 0)) return <PageLoader />;
  if (!canManage) return <AccessDenied />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-semibold text-indigo-300">Property finance</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Monthly Property Ledger</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Rent collection and every property expense in one monthly statement.</p></div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/property-ledger/templates" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:border-indigo-500 hover:text-white"><FaLayerGroup /> Templates</Link>
              <Link href="/dashboard/property-ledger/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:border-emerald-500 hover:text-white"><FaChartColumn /> Reports</Link>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {isSuperAdmin && <Field label="Owner"><select className={inputClass} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{owners.map((owner) => <option key={getDocumentId(owner)} value={getDocumentId(owner)}>{formatUserName(owner.name)}</option>)}</select></Field>}
            <Field label="Property"><select className={inputClass} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Select property</option>{properties.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}</select></Field>
            <Field label="Month"><input className={inputClass} type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></Field>
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {!propertyId ? <EmptyState title="No property selected" text="Create or select a property to start its ledger." /> : overview && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Summary icon={FaFileInvoiceDollar} label="Rent billed" value={money(overview.summary.rentBilled)} tone="indigo" />
              <Summary icon={FaArrowTrendUp} label="Cash received" value={money(overview.summary.totalCashIncome)} tone="emerald" />
              <Summary icon={FaArrowTrendDown} label="Expenses paid" value={money(overview.summary.expensePaid)} tone="rose" />
              <Summary icon={FaWallet} label="Net cash flow" value={money(overview.summary.netCashFlow)} tone={overview.summary.netCashFlow >= 0 ? 'emerald' : 'rose'} />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
              <div><h2 className="font-bold">{selectedProperty?.name} · {new Date(`${period}-01T00:00:00`).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</h2><p className="text-xs text-slate-400">Review variable amounts before marking expenses paid.</p></div>
              <button type="button" onClick={prepare} disabled={isPreparing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">{isPreparing ? <FaSpinner className="animate-spin" /> : <FaLayerGroup />} Prepare month</button>
            </div>

            <section className="grid items-start gap-6 xl:grid-cols-2">
              <LedgerPanel title="Income" subtitle={`Outstanding rent: ${money(overview.summary.rentOutstanding)}`} action={<button onClick={() => openEntry('income')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><FaPlus /> Other income</button>}>
                <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Customer / details</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th><th className="w-20 px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-800">
                  {overview.rentBills.map((bill) => <tr key={bill._id}><td className="px-4 py-3"><p className="font-semibold text-slate-200">Flat {bill.apartmentSnapshot.apartmentNumber}</p><p className="text-xs text-slate-500">{bill.receiptNumber}</p></td><td className="px-4 py-3 text-slate-300">{bill.tenantSnapshot.name}</td><td className="px-4 py-3"><StatusBadge status={bill.status} /></td><td className="px-4 py-3 text-right font-bold text-emerald-300">{money(bill.totalAmount)}</td><td /></tr>)}
                  {overview.otherIncome.map((item) => <tr key={item._id}><td className="px-4 py-3"><p className="font-semibold text-slate-200">Other income</p><p className="text-xs text-slate-500">{item.receivedDate?.slice(0, 10) || 'No date'}</p></td><td className="px-4 py-3"><p className="text-slate-300">{item.title}</p>{item.note && <p className="max-w-xs truncate text-xs text-slate-500">{item.note}</p>}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-right font-bold text-emerald-300">{money(item.amount)}</td><td className="px-4 py-3"><RowActions onEdit={() => openEntry('income', item)} onDelete={() => void removeEntry('income', item._id)} /></td></tr>)}
                  {!overview.rentBills.length && !overview.otherIncome.length && <TableEmpty text="No income entries for this month." />}
                </tbody></table></div>
              </LedgerPanel>

              <LedgerPanel title="Expenses" subtitle={`Pending: ${money(overview.summary.expensePending)}`} action={<button onClick={() => openEntry('expense')} className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25"><FaPlus /> Add expense</button>}>
                <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Expense</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th><th className="w-20 px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-800">
                  {overview.expenses.map((item) => <tr key={item._id} className={item.status === 'skipped' ? 'opacity-50' : ''}><td className="px-4 py-3"><p className="font-semibold text-slate-200">{item.title}</p><p className="text-xs text-slate-500">{item.source === 'template' ? 'Recurring template' : item.expenseDate?.slice(0, 10) || 'Manual'}</p></td><td className="px-4 py-3 text-slate-400">{typeof item.categoryId === 'string' ? 'Expense' : item.categoryId.name}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-right font-bold text-rose-300">{item.amount == null ? 'Not set' : money(item.amount)}</td><td className="px-4 py-3"><RowActions onEdit={() => openEntry('expense', item)} onDelete={() => void removeEntry('expense', item._id)} /></td></tr>)}
                  {!overview.expenses.length && <TableEmpty text="Prepare the month or add an expense." />}
                </tbody></table></div>
              </LedgerPanel>
            </section>
          </>
        )}
      </div>

      <ManagementModal open={Boolean(modal)} title={`${modal?.item ? 'Edit' : 'Add'} ${modal?.kind === 'expense' ? 'expense' : 'other income'}`} onClose={() => !isSaving && setModal(null)} disableClose={isSaving}>
        <form onSubmit={submitEntry} className="space-y-4 p-5">
          <Field label="Title"><input className={inputClass} required value={entryForm.title} onChange={(event) => setEntryForm((value) => ({ ...value, title: event.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount (BDT)"><input className={inputClass} type="number" min="0" step="0.01" required={modal?.kind === 'income'} value={entryForm.amount} onChange={(event) => setEntryForm((value) => ({ ...value, amount: event.target.value }))} /></Field><Field label="Date"><input className={inputClass} type="date" value={entryForm.date} onChange={(event) => setEntryForm((value) => ({ ...value, date: event.target.value }))} /></Field></div>
          {modal?.kind === 'expense' && <Field label="Category"><select className={inputClass} required value={entryForm.categoryId} onChange={(event) => setEntryForm((value) => ({ ...value, categoryId: event.target.value }))}>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Apartment (optional)"><select className={inputClass} value={entryForm.apartmentId} onChange={(event) => setEntryForm((value) => ({ ...value, apartmentId: event.target.value }))}><option value="">Whole property</option>{apartments.map((item) => <option key={item._id} value={item._id}>{item.apartmentNumber}</option>)}</select></Field><Field label="Status"><select className={inputClass} value={entryForm.status} onChange={(event) => setEntryForm((value) => ({ ...value, status: event.target.value }))}>{modal?.kind === 'expense' ? <><option value="pending">Pending</option><option value="paid">Paid</option><option value="skipped">Skip this month</option></> : <><option value="pending">Pending</option><option value="received">Received</option></>}</select></Field></div>
          <Field label="Payment method (optional)"><input className={inputClass} value={entryForm.paymentMethod} onChange={(event) => setEntryForm((value) => ({ ...value, paymentMethod: event.target.value }))} placeholder="Cash, bank, mobile banking..." /></Field>
          <Field label="Note"><textarea className={`${inputClass} min-h-24 resize-y`} value={entryForm.note} onChange={(event) => setEntryForm((value) => ({ ...value, note: event.target.value }))} /></Field>
          {modalError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{modalError}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSaving && <FaSpinner className="animate-spin" />} Save entry</button></div>
        </form>
      </ManagementModal>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className={labelClass}>{label}</span>{children}</label>; }
function LedgerPanel({ title, subtitle, action, children }: { title: string; subtitle: string; action: React.ReactNode; children: React.ReactNode }) { return <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70 shadow-xl"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-4"><div><h2 className="font-bold">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div>{action}</div>{children}</div>; }
function Summary({ icon: Icon, label, value, tone }: { icon: React.ComponentType; label: string; value: string; tone: 'indigo' | 'emerald' | 'rose' }) { const styles = tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-300' : tone === 'rose' ? 'bg-rose-500/10 text-rose-300' : 'bg-indigo-500/10 text-indigo-300'; return <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${styles}`}><Icon /></div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
function StatusBadge({ status }: { status: string }) { const style = status === 'paid' || status === 'received' ? 'bg-emerald-500/10 text-emerald-300' : status === 'skipped' ? 'bg-slate-700 text-slate-300' : status === 'due' ? 'bg-amber-500/10 text-amber-300' : 'bg-orange-500/10 text-orange-300'; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${style}`}>{status}</span>; }
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="flex justify-end gap-1"><button onClick={onEdit} aria-label="Edit" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-300"><FaPenToSquare /></button><button onClick={onDelete} aria-label="Remove" className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><FaTrash /></button></div>; }
function TableEmpty({ text }: { text: string }) { return <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{text}</td></tr>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>; }
function PageLoader() { return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-3xl text-indigo-400" /></div>; }
function AccessDenied() { return <div className="min-h-[70vh] bg-slate-950 p-10 text-center text-slate-300">Property ledger is available to owners and Super Admin only.</div>; }
