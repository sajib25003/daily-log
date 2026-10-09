'use client';

import ManagementModal from '@/components/property/ManagementModal';
import { useAuth } from '@/context/AuthContext';
import { listActiveOwners, listApartments, listProperties } from '@/lib/propertyApi';
import {
  createExpenseCategory,
  createExpenseTemplate,
  deleteExpenseTemplate,
  listExpenseCategories,
  listExpenseTemplates,
  updateExpenseCategory,
  updateExpenseTemplate,
} from '@/lib/propertyLedgerApi';
import type { ExpenseTemplatePayload } from '@/lib/propertyLedgerApi';
import { formatUserName, getDocumentId } from '@/types/property';
import type { Apartment, Property, UserReference } from '@/types/property';
import type { ExpenseCategory, ExpenseTemplate, TemplateFrequency } from '@/types/propertyLedger';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FaArrowLeft, FaEdit, FaPlus, FaSpinner, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const fieldLabel = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400';
const idOf = (value: string | { _id: string } | null | undefined) => typeof value === 'string' ? value : value?._id ?? '';
const nowMonth = () => new Date().toISOString().slice(0, 7);
const blankForm = { categoryId: '', title: '', defaultAmount: '', frequency: 'monthly' as TemplateFrequency, months: [] as number[], activeFrom: nowMonth(), activeTo: '', dueDay: '', apartmentId: '', note: '', isActive: true };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LedgerTemplatesPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTemplate | null>(null);
  const [form, setForm] = useState(blankForm);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const effectiveOwnerId = isSuperAdmin ? ownerId : (user?.id ?? '');

  useEffect(() => {
    if (!user || !canManage || !isSuperAdmin) return;
    listActiveOwners().then((items) => { setOwners(items); setOwnerId((value) => value || getDocumentId(items[0])); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Failed to load owners.'));
  }, [canManage, isSuperAdmin, user]);

  useEffect(() => {
    if (!effectiveOwnerId) return;
    listProperties(isSuperAdmin ? { ownerId: effectiveOwnerId } : undefined).then((items) => { setProperties(items); setPropertyId((value) => items.some((item) => item._id === value) ? value : items[0]?._id ?? ''); if (!items.length) setIsLoading(false); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Failed to load properties.'));
  }, [effectiveOwnerId, isSuperAdmin]);

  const loadData = useCallback(async () => {
    if (!effectiveOwnerId || !propertyId) return;
    const [templateData, categoryData, apartmentData] = await Promise.all([
      listExpenseTemplates({ ownerId: isSuperAdmin ? effectiveOwnerId : undefined, propertyId, includeInactive }),
      listExpenseCategories(isSuperAdmin ? effectiveOwnerId : undefined, true),
      listApartments(propertyId),
    ]);
    setTemplates(templateData); setCategories(categoryData); setApartments(apartmentData.apartments);
  }, [effectiveOwnerId, includeInactive, isSuperAdmin, propertyId]);

  useEffect(() => {
    if (!effectiveOwnerId || !propertyId) return;
    let cancelled = false;
    Promise.all([
      listExpenseTemplates({ ownerId: isSuperAdmin ? effectiveOwnerId : undefined, propertyId, includeInactive }),
      listExpenseCategories(isSuperAdmin ? effectiveOwnerId : undefined, true),
      listApartments(propertyId),
    ]).then(([templateData, categoryData, apartmentData]) => { if (!cancelled) { setTemplates(templateData); setCategories(categoryData); setApartments(apartmentData.apartments); setError(''); } }).catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : 'Failed to load templates.')).finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [effectiveOwnerId, includeInactive, isSuperAdmin, propertyId]);

  const openCreate = () => { setEditing(null); setForm({ ...blankForm, categoryId: categories.find((item) => item.isActive)?._id ?? '' }); setModalError(''); setModalOpen(true); };
  const openEdit = (item: ExpenseTemplate) => { setEditing(item); setForm({ categoryId: idOf(item.categoryId), title: item.title, defaultAmount: item.defaultAmount == null ? '' : String(item.defaultAmount), frequency: item.frequency, months: item.months ?? [], activeFrom: item.activeFrom, activeTo: item.activeTo ?? '', dueDay: item.dueDay == null ? '' : String(item.dueDay), apartmentId: idOf(item.apartmentId), note: item.note ?? '', isActive: item.isActive }); setModalError(''); setModalOpen(true); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsSaving(true); setModalError('');
    const payload: ExpenseTemplatePayload = { ownerId: isSuperAdmin ? ownerId : undefined, propertyId, apartmentId: form.apartmentId || null, categoryId: form.categoryId, title: form.title, defaultAmount: form.defaultAmount === '' ? null : Number(form.defaultAmount), frequency: form.frequency, months: form.months, activeFrom: form.activeFrom, activeTo: form.activeTo || null, dueDay: form.dueDay === '' ? null : Number(form.dueDay), note: form.note || null, isActive: form.isActive };
    try { if (editing) await updateExpenseTemplate(editing._id, payload); else await createExpenseTemplate(payload); setModalOpen(false); await loadData(); }
    catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Failed to save template.'); }
    finally { setIsSaving(false); }
  };

  const remove = async (item: ExpenseTemplate) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Delete recurring template?', text: 'Existing monthly ledger entries will remain unchanged.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc2626', background: '#0f172a', color: '#e2e8f0' });
    if (!result.isConfirmed) return;
    try { await deleteExpenseTemplate(item._id); await loadData(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to delete template.'); }
  };

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    setIsSaving(true); setModalError('');
    try { const created = await createExpenseCategory({ ownerId: isSuperAdmin ? ownerId : undefined, name: categoryName }); setCategories((items) => [...items, created]); setForm((value) => ({ ...value, categoryId: created._id })); setCategoryName(''); }
    catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Failed to create category.'); }
    finally { setIsSaving(false); }
  };

  const toggleCategory = async (category: ExpenseCategory) => {
    try { await updateExpenseCategory(category._id, { isActive: !category.isActive }); await loadData(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to update category.'); }
  };

  if (isAuthLoading || isLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-3xl text-indigo-400" /></div>;
  if (!canManage) return <div className="min-h-[70vh] bg-slate-950 p-10 text-center text-slate-300">Access denied.</div>;

  return <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-2xl"><Link href="/dashboard/property-ledger" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><FaArrowLeft /> Monthly ledger</Link><div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-indigo-300">Recurring setup</p><h1 className="mt-1 text-3xl font-bold">Expense Templates</h1><p className="mt-2 text-sm text-slate-400">Prepare common monthly costs without locking their final amount.</p></div><button onClick={openCreate} disabled={!propertyId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50"><FaPlus /> New template</button></div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">{isSuperAdmin && <SelectField label="Owner" value={ownerId} onChange={setOwnerId}>{owners.map((item) => <option key={getDocumentId(item)} value={getDocumentId(item)}>{formatUserName(item.name)}</option>)}</SelectField>}<SelectField label="Property" value={propertyId} onChange={setPropertyId}><option value="">Select property</option>{properties.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</SelectField><label className="flex items-end"><span className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} /> Show inactive templates</span></label></div>
    </header>
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70"><div className="border-b border-slate-800 px-5 py-4"><h2 className="font-bold">Templates ({templates.length})</h2></div><div className="divide-y divide-slate-800">{templates.map((item) => <article key={item._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-sm text-slate-400">{typeof item.categoryId === 'string' ? 'Expense' : item.categoryId.name} · {item.frequency} · {item.defaultAmount == null ? 'Variable amount' : `৳${item.defaultAmount.toLocaleString()}`}</p><p className="mt-1 text-xs text-slate-500">From {item.activeFrom}{item.activeTo ? ` to ${item.activeTo}` : ''}{item.apartmentId ? ` · Flat ${typeof item.apartmentId === 'string' ? '' : item.apartmentId.apartmentNumber}` : ' · Whole property'}</p></div><div className="flex gap-2"><button onClick={() => openEdit(item)} className="rounded-lg border border-slate-700 p-2.5 text-slate-300 hover:border-indigo-500 hover:text-indigo-300"><FaEdit /></button><button onClick={() => void remove(item)} className="rounded-lg border border-slate-700 p-2.5 text-slate-300 hover:border-rose-500 hover:text-rose-300"><FaTrash /></button></div></article>)}{!templates.length && <p className="p-12 text-center text-sm text-slate-500">No recurring expense templates yet.</p>}</div></div>
      <aside className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4"><h2 className="font-bold">Expense categories</h2><p className="mt-1 text-xs text-slate-500">Inactive categories remain in historical entries.</p><div className="mt-4 space-y-2">{categories.map((item) => <button key={item._id} onClick={() => void toggleCategory(item)} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-sm"><span className={item.isActive ? 'text-slate-300' : 'text-slate-600'}>{item.name}</span><span className={`h-2 w-2 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} /></button>)}</div></aside>
    </section>
  </div>

  <ManagementModal open={modalOpen} title={editing ? 'Edit expense template' : 'Create expense template'} onClose={() => !isSaving && setModalOpen(false)} disableClose={isSaving} maxWidthClass="max-w-2xl"><form onSubmit={submit} className="space-y-4 p-5">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Template title"><input className={inputClass} required value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="e.g. Caretaker salary" /></Field><Field label="Default amount (optional)"><input className={inputClass} type="number" min="0" step="0.01" value={form.defaultAmount} onChange={(event) => setForm((value) => ({ ...value, defaultAmount: event.target.value }))} placeholder="Leave blank if variable" /></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select className={inputClass} required value={form.categoryId} onChange={(event) => setForm((value) => ({ ...value, categoryId: event.target.value }))}>{categories.filter((item) => item.isActive || item._id === form.categoryId).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field><Field label="Apartment (optional)"><select className={inputClass} value={form.apartmentId} onChange={(event) => setForm((value) => ({ ...value, apartmentId: event.target.value }))}><option value="">Whole property</option>{apartments.map((item) => <option key={item._id} value={item._id}>{item.apartmentNumber}</option>)}</select></Field></div>
    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3"><p className={fieldLabel}>Quick add category</p><div className="flex gap-2"><input className={inputClass} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" /><button type="button" onClick={() => void addCategory()} className="rounded-xl border border-indigo-500/40 px-4 text-sm font-bold text-indigo-300">Add</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Frequency"><select className={inputClass} value={form.frequency} onChange={(event) => setForm((value) => ({ ...value, frequency: event.target.value as TemplateFrequency }))}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Selected months</option></select></Field><Field label="Due day (optional)"><input className={inputClass} type="number" min="1" max="31" value={form.dueDay} onChange={(event) => setForm((value) => ({ ...value, dueDay: event.target.value }))} /></Field></div>
    {form.frequency !== 'monthly' && <Field label="Applicable months"><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{MONTHS.map((month, index) => { const number = index + 1; const active = form.months.includes(number); return <button key={month} type="button" onClick={() => setForm((value) => ({ ...value, months: active ? value.months.filter((item) => item !== number) : [...value.months, number] }))} className={`rounded-lg border px-2 py-2 text-xs font-bold ${active ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' : 'border-slate-700 text-slate-400'}`}>{month}</button>; })}</div></Field>}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Active from"><input className={inputClass} type="month" required value={form.activeFrom} onChange={(event) => setForm((value) => ({ ...value, activeFrom: event.target.value }))} /></Field><Field label="Active to (optional)"><input className={inputClass} type="month" value={form.activeTo} onChange={(event) => setForm((value) => ({ ...value, activeTo: event.target.value }))} /></Field></div>
    <Field label="Note"><textarea className={`${inputClass} min-h-24`} value={form.note} onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} /></Field>
    <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} /> Active template</label>
    {modalError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{modalError}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold disabled:opacity-60">{isSaving && <FaSpinner className="animate-spin" />} Save template</button></div>
  </form></ManagementModal>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className={fieldLabel}>{label}</span>{children}</label>; }
function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <Field label={label}><select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></Field>; }
