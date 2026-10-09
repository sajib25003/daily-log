'use client';

import { useAuth } from '@/context/AuthContext';
import { listActiveOwners, listProperties } from '@/lib/propertyApi';
import { getLedgerReport } from '@/lib/propertyLedgerApi';
import { downloadLedgerCsv, downloadLedgerExcel } from '@/lib/propertyLedgerExport';
import { formatUserName, getDocumentId } from '@/types/property';
import type { Property, UserReference } from '@/types/property';
import type { LedgerReport } from '@/types/propertyLedger';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaDownload, FaFileCsv, FaFileExcel, FaFilePdf, FaSpinner } from 'react-icons/fa6';

type RangePreset = 'month' | 'year' | 'fy' | 'custom';
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const money = (value: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(value);
const initialRange = () => { const now = new Date(); const year = now.getFullYear(); const month = now.getMonth() + 1; const period = `${year}-${String(month).padStart(2, '0')}`; return { period, start: period, end: period, year: String(year), fy: String(month >= 7 ? year : year - 1) }; };

export default function PropertyLedgerReportsPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';
  const initial = initialRange();
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [month, setMonth] = useState(initial.period);
  const [year, setYear] = useState(initial.year);
  const [fy, setFy] = useState(initial.fy);
  const [startPeriod, setStartPeriod] = useState(initial.start);
  const [endPeriod, setEndPeriod] = useState(initial.end);
  const [report, setReport] = useState<LedgerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const effectiveOwnerId = isSuperAdmin ? ownerId : (user?.id ?? '');

  useEffect(() => {
    if (!user || !canManage || !isSuperAdmin) return;
    listActiveOwners().then((items) => { setOwners(items); setOwnerId((value) => value || getDocumentId(items[0])); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Failed to load owners.'));
  }, [canManage, isSuperAdmin, user]);

  useEffect(() => {
    if (!effectiveOwnerId) return;
    listProperties(isSuperAdmin ? { ownerId: effectiveOwnerId } : undefined).then(setProperties).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Failed to load properties.'));
  }, [effectiveOwnerId, isSuperAdmin]);

  const resolveRange = () => {
    if (preset === 'month') return { start: month, end: month };
    if (preset === 'year') return { start: `${year}-01`, end: `${year}-12` };
    if (preset === 'fy') { const startYear = Number(fy); return { start: `${startYear}-07`, end: `${startYear + 1}-06` }; }
    return { start: startPeriod, end: endPeriod };
  };

  const generate = async () => {
    const range = resolveRange(); setIsLoading(true); setError('');
    try { const data = await getLedgerReport({ ownerId: isSuperAdmin ? effectiveOwnerId : undefined, propertyId: propertyId || undefined, startPeriod: range.start, endPeriod: range.end }); setReport(data); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to create report.'); }
    finally { setIsLoading(false); }
  };

  const printReport = () => { document.body.classList.add('printing-property-ledger'); const clean = () => { document.body.classList.remove('printing-property-ledger'); window.removeEventListener('afterprint', clean); }; window.addEventListener('afterprint', clean); window.print(); };

  if (isAuthLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-3xl text-indigo-400" /></div>;
  if (!canManage) return <div className="min-h-[70vh] bg-slate-950 p-10 text-center text-slate-300">Access denied.</div>;

  return <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-2xl"><Link href="/dashboard/property-ledger" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><FaArrowLeft /> Monthly ledger</Link><div className="mt-4"><p className="text-sm font-semibold text-emerald-300">Financial overview</p><h1 className="mt-1 text-3xl font-bold">Property Ledger Reports</h1><p className="mt-2 text-sm text-slate-400">Monthly, calendar year, financial year (July–June), or any custom month range.</p></div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{isSuperAdmin && <Field label="Owner"><select className={inputClass} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{owners.map((item) => <option key={getDocumentId(item)} value={getDocumentId(item)}>{formatUserName(item.name)}</option>)}</select></Field>}<Field label="Property"><select className={inputClass} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">All properties</option>{properties.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field><Field label="Range"><select className={inputClass} value={preset} onChange={(event) => setPreset(event.target.value as RangePreset)}><option value="month">Single month</option><option value="year">Calendar year (Jan–Dec)</option><option value="fy">Financial year (Jul–Jun)</option><option value="custom">Custom range</option></select></Field>{preset === 'month' && <Field label="Month"><input className={inputClass} type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field>}{preset === 'year' && <Field label="Year"><input className={inputClass} type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></Field>}{preset === 'fy' && <Field label="Financial year"><select className={inputClass} value={fy} onChange={(event) => setFy(event.target.value)}>{Array.from({ length: 10 }, (_, index) => Number(initial.fy) - 4 + index).map((value) => <option key={value} value={value}>{value}–{value + 1}</option>)}</select></Field>}{preset === 'custom' && <><Field label="From month"><input className={inputClass} type="month" value={startPeriod} onChange={(event) => setStartPeriod(event.target.value)} /></Field><Field label="To month"><input className={inputClass} type="month" value={endPeriod} onChange={(event) => setEndPeriod(event.target.value)} /></Field></>}</div>
      <button onClick={() => void generate()} disabled={!effectiveOwnerId || isLoading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50">{isLoading ? <FaSpinner className="animate-spin" /> : <FaDownload />} Generate report</button>
    </header>
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {report && <>
      <div className="flex flex-wrap justify-end gap-2"><button onClick={() => downloadLedgerCsv(report)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold hover:border-emerald-500"><FaFileCsv /> CSV</button><button onClick={() => downloadLedgerExcel(report)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold hover:border-emerald-500"><FaFileExcel /> Excel</button><button onClick={printReport} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold hover:border-rose-500"><FaFilePdf /> Print / Save PDF</button></div>
      <section id="property-ledger-report-print-area" className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 print:bg-white print:text-black">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-700 pb-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-300">AHB Home Management System</p><h2 className="mt-1 text-2xl font-bold">Property Ledger Report</h2><p className="mt-1 text-sm text-slate-400">{report.selectedProperty?.name ?? 'All properties'} · {report.startPeriod} to {report.endPeriod}</p></div><p className="text-xs text-slate-500">Generated {new Date().toLocaleString('en-BD')}</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><ReportSummary label="Rent billed" value={report.summary.rentBilled} /><ReportSummary label="Rent collected" value={report.summary.rentCollected} /><ReportSummary label="Other income" value={report.summary.otherIncome} /><ReportSummary label="Expenses paid" value={report.summary.expenses} /><ReportSummary label="Net cash flow" value={report.summary.netCashFlow} highlight /></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr className="border-y border-slate-700 text-left text-xs uppercase text-slate-500"><th className="px-3 py-3">Period</th><th className="px-3 py-3 text-right">Rent billed</th><th className="px-3 py-3 text-right">Collected</th><th className="px-3 py-3 text-right">Other income</th><th className="px-3 py-3 text-right">Expenses</th><th className="px-3 py-3 text-right">Net cash flow</th></tr></thead><tbody className="divide-y divide-slate-800">{report.monthly.map((row) => <tr key={row.period}><td className="px-3 py-3 font-semibold">{new Date(`${row.period}-01T00:00:00`).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</td><td className="px-3 py-3 text-right">{money(row.rentBilled)}</td><td className="px-3 py-3 text-right text-emerald-300">{money(row.rentCollected)}</td><td className="px-3 py-3 text-right">{money(row.otherIncome)}</td><td className="px-3 py-3 text-right text-rose-300">{money(row.expenses)}</td><td className={`px-3 py-3 text-right font-bold ${row.netCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(row.netCashFlow)}</td></tr>)}</tbody></table></div>
      </section>
    </>}
    {!report && !error && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center text-sm text-slate-500">Choose a period and generate the report.</div>}
  </div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>; }
function ReportSummary({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) { return <div className={`rounded-xl border p-3 ${highlight ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-slate-700 bg-slate-950/40'}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{money(value)}</p></div>; }
