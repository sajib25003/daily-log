'use client';

import ManagementModal from '@/components/property/ManagementModal';
import {
  listElectricityProviders,
  updateApartmentElectricityConfig,
  updatePropertyElectricitySettings,
  updateRentTerms,
} from '@/lib/rentApi';
import type { ElectricityProvider } from '@/types/billing';
import type {
  Apartment,
  ApartmentElectricityBillingType,
  ElectricityMeterPhase,
  ElectricityPaymentResponsibility,
  Property,
  RentTermsFormData,
  Tenancy,
} from '@/types/property';
import { getDocumentId } from '@/types/property';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { FaBolt, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import Swal from 'sweetalert2';

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60';

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? '';

const createRentForm = (tenancy: Tenancy): RentTermsFormData => ({
  baseRent: tenancy.rentTerms ? String(tenancy.rentTerms.baseRent) : '',
  dueDay: tenancy.rentTerms ? String(tenancy.rentTerms.dueDay) : '10',
  effectiveFrom: dateValue(
    tenancy.rentTerms?.effectiveFrom ?? tenancy.startDate,
  ),
  noticeValue: tenancy.rentTerms
    ? String(tenancy.rentTerms.noticePeriod.value)
    : '1',
  noticeUnit: tenancy.rentTerms?.noticePeriod.unit ?? 'months',
  revisionIntervalMonths:
    tenancy.rentTerms?.rentRevision.intervalMonths === null ||
    tenancy.rentTerms?.rentRevision.intervalMonths === undefined
      ? ''
      : String(tenancy.rentTerms.rentRevision.intervalMonths),
  nextRevisionDate: dateValue(
    tenancy.rentTerms?.rentRevision.nextRevisionDate,
  ),
  revisionNote: tenancy.rentTerms?.rentRevision.note ?? '',
  securityDeposit:
    tenancy.rentTerms?.securityDeposit === null ||
    tenancy.rentTerms?.securityDeposit === undefined
      ? ''
      : String(tenancy.rentTerms.securityDeposit),
  advanceAmount:
    tenancy.rentTerms?.advanceAmount === null ||
    tenancy.rentTerms?.advanceAmount === undefined
      ? ''
      : String(tenancy.rentTerms.advanceAmount),
  agreementStartDate: dateValue(tenancy.rentTerms?.agreementStartDate),
  agreementEndDate: dateValue(tenancy.rentTerms?.agreementEndDate),
  note: tenancy.rentTerms?.note ?? '',
  rateChangeNote: '',
});

const showToast = (title: string) => {
  void Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 1600,
    background: '#0f172a',
    color: '#e2e8f0',
  });
};

export function PropertyElectricityButton({
  property,
  onUpdated,
}: {
  property: Property;
  onUpdated: (property: Property) => void;
}) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<ElectricityProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    providerId: getDocumentId(property.electricitySettings?.providerId),
    accountNumber: property.electricitySettings?.accountNumber ?? '',
    defaultMeterPhase:
      property.electricitySettings?.defaultMeterPhase ??
      ('singlePhase' as ElectricityMeterPhase),
  });

  const openModal = async () => {
    setOpen(true);
    setError('');
    setForm({
      providerId: getDocumentId(property.electricitySettings?.providerId),
      accountNumber: property.electricitySettings?.accountNumber ?? '',
      defaultMeterPhase:
        property.electricitySettings?.defaultMeterPhase ?? 'singlePhase',
    });
    if (providers.length > 0) return;
    setIsLoading(true);
    try {
      setProviders(await listElectricityProviders());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load electricity providers.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const updated = await updatePropertyElectricitySettings(property._id, {
        providerId: form.providerId,
        accountNumber: form.accountNumber.trim() || null,
        defaultMeterPhase: form.defaultMeterPhase,
      });
      onUpdated(updated);
      setOpen(false);
      showToast('Property electricity settings saved.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save electricity settings.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => void openModal()} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20">
        <FaBolt /> Property Electricity
      </button>
      <ManagementModal open={open} title="Property electricity settings" onClose={() => !isSaving && setOpen(false)} disableClose={isSaving}>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4"><p className="font-semibold">{property.name}</p><p className="mt-1 text-xs text-slate-500">Applied by default to every apartment in this property.</p></div>
          {isLoading ? <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-emerald-400" /></div> : <>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Electricity provider *</span><select required value={form.providerId} onChange={(event) => setForm((current) => ({ ...current, providerId: event.target.value }))} className={inputClassName}><option value="">Select provider</option>{providers.map((provider) => <option key={provider._id} value={provider._id}>{provider.name} ({provider.code})</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Account number</span><input value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} placeholder="Optional property account number" className={inputClassName} /></label>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Default meter phase</span><select value={form.defaultMeterPhase} onChange={(event) => setForm((current) => ({ ...current, defaultMeterPhase: event.target.value as ElectricityMeterPhase }))} className={inputClassName}><option value="singlePhase">Single phase</option><option value="threePhase">Three phase</option></select></label>
          </>}
          <ModalError message={error} />
          <ModalActions saving={isSaving} onCancel={() => setOpen(false)} label="Save settings" disabled={isLoading || providers.length === 0} />
        </form>
      </ManagementModal>
    </>
  );
}

export function ApartmentBillingControls({
  apartment,
  property,
  onApartmentUpdated,
  onTenancyUpdated,
}: {
  apartment: Apartment;
  property: Property;
  onApartmentUpdated: (apartment: Apartment) => void;
  onTenancyUpdated: (tenancy: Tenancy) => void;
}) {
  const tenancy = apartment.currentTenancy;
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [electricityForm, setElectricityForm] = useState({
    billingType:
      apartment.electricityConfig?.billingType ??
      ('postpaid' as ApartmentElectricityBillingType),
    paymentResponsibility:
      apartment.electricityConfig?.paymentResponsibility ??
      ('ownerCollects' as ElectricityPaymentResponsibility),
    meterNumber: apartment.electricityConfig?.meterNumber ?? '',
    note: apartment.electricityConfig?.note ?? '',
  });
  const [rentForm, setRentForm] = useState<RentTermsFormData | null>(
    tenancy ? createRentForm(tenancy) : null,
  );

  const openElectricity = () => {
    setError('');
    setElectricityForm({
      billingType: apartment.electricityConfig?.billingType ?? 'postpaid',
      paymentResponsibility:
        apartment.electricityConfig?.paymentResponsibility ?? 'ownerCollects',
      meterNumber: apartment.electricityConfig?.meterNumber ?? '',
      note: apartment.electricityConfig?.note ?? '',
    });
    setElectricityOpen(true);
  };

  const submitElectricity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateApartmentElectricityConfig(apartment._id, {
        billingType: electricityForm.billingType,
        paymentResponsibility: electricityForm.paymentResponsibility,
        meterNumber: electricityForm.meterNumber.trim() || null,
        note: electricityForm.note.trim() || null,
      });
      onApartmentUpdated(updated);
      setElectricityOpen(false);
      showToast('Apartment electricity setup saved.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save apartment electricity setup.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openRent = () => {
    if (!tenancy) return;
    setRentForm(createRentForm(tenancy));
    setError('');
    setRentOpen(true);
  };

  const submitRent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tenancy || !rentForm) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateRentTerms(tenancy._id, rentForm);
      onTenancyUpdated(updated);
      setRentOpen(false);
      showToast('Rent terms saved.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save rent terms.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const billingTypeDisablesResponsibility =
    electricityForm.billingType === 'includedInRent' ||
    electricityForm.billingType === 'notApplicable';

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={openElectricity} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"><FaBolt /> Electricity</button>
        <button type="button" onClick={openRent} disabled={!tenancy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"><FaMoneyBillWave /> Rent Terms</button>
      </div>

      <ManagementModal open={electricityOpen} title={`Electricity · ${apartment.apartmentNumber}`} onClose={() => !isSaving && setElectricityOpen(false)} disableClose={isSaving}>
        <form onSubmit={submitElectricity} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4"><p className="font-semibold">{property.name} / {apartment.apartmentNumber}</p><p className="mt-1 text-xs text-slate-500">Electricity provider is inherited from the property.</p></div>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Billing type *</span><select value={electricityForm.billingType} onChange={(event) => setElectricityForm((current) => ({ ...current, billingType: event.target.value as ApartmentElectricityBillingType }))} className={inputClassName}><option value="postpaid">Postpaid</option><option value="prepaid">Prepaid recharge</option><option value="submeter">Submeter</option><option value="includedInRent">Included in rent</option><option value="notApplicable">Not applicable</option></select></label>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Payment responsibility</span><select disabled={billingTypeDisablesResponsibility} value={billingTypeDisablesResponsibility ? 'notApplicable' : electricityForm.paymentResponsibility} onChange={(event) => setElectricityForm((current) => ({ ...current, paymentResponsibility: event.target.value as ElectricityPaymentResponsibility }))} className={inputClassName}><option value="ownerCollects">Owner collects bill</option><option value="tenantPaysDirectly">Tenant pays directly</option><option value="notApplicable">Not applicable</option></select></label>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Meter number</span><input value={electricityForm.meterNumber} onChange={(event) => setElectricityForm((current) => ({ ...current, meterNumber: event.target.value }))} className={inputClassName} /></label>
            <label className="block"><span className="mb-2 block text-sm text-slate-300">Note</span><textarea rows={3} value={electricityForm.note} onChange={(event) => setElectricityForm((current) => ({ ...current, note: event.target.value }))} className={`${inputClassName} resize-none`} /></label>
          <ModalError message={error} /><ModalActions saving={isSaving} onCancel={() => setElectricityOpen(false)} label="Save electricity setup" />
        </form>
      </ManagementModal>

      <ManagementModal open={rentOpen} title={`Rent terms · ${apartment.apartmentNumber}`} onClose={() => !isSaving && setRentOpen(false)} disableClose={isSaving} maxWidthClass="max-w-3xl">
        {rentForm && tenancy && <form onSubmit={submitRent} className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-3"><NumberField label="Base rent" required value={rentForm.baseRent} onChange={(baseRent) => setRentForm((current) => current && ({ ...current, baseRent }))} /><NumberField label="Due day" required min="1" max="31" step="1" value={rentForm.dueDay} onChange={(dueDay) => setRentForm((current) => current && ({ ...current, dueDay }))} /><DateField label="Effective from" required min={dateValue(tenancy.startDate)} value={rentForm.effectiveFrom} onChange={(effectiveFrom) => setRentForm((current) => current && ({ ...current, effectiveFrom }))} /></div>
          <fieldset className="rounded-2xl border border-slate-700 p-4"><legend className="px-2 font-bold">Notice period</legend><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Notice value" required min="0" step="1" value={rentForm.noticeValue} onChange={(noticeValue) => setRentForm((current) => current && ({ ...current, noticeValue }))} /><label className="block"><span className="mb-2 block text-sm text-slate-300">Unit</span><select value={rentForm.noticeUnit} onChange={(event) => setRentForm((current) => current && ({ ...current, noticeUnit: event.target.value as 'days' | 'months' }))} className={inputClassName}><option value="months">Months</option><option value="days">Days</option></select></label></div></fieldset>
          <fieldset className="rounded-2xl border border-slate-700 p-4"><legend className="px-2 font-bold">Rent revision</legend><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Review interval (months)" min="1" step="1" value={rentForm.revisionIntervalMonths} onChange={(revisionIntervalMonths) => setRentForm((current) => current && ({ ...current, revisionIntervalMonths }))} /><DateField label="Next revision date" value={rentForm.nextRevisionDate} onChange={(nextRevisionDate) => setRentForm((current) => current && ({ ...current, nextRevisionDate }))} /></div><label className="mt-4 block"><span className="mb-2 block text-sm text-slate-300">Revision note</span><input value={rentForm.revisionNote} onChange={(event) => setRentForm((current) => current && ({ ...current, revisionNote: event.target.value }))} className={inputClassName} /></label></fieldset>
          <div className="grid gap-4 sm:grid-cols-2"><NumberField label="Security deposit" value={rentForm.securityDeposit} onChange={(securityDeposit) => setRentForm((current) => current && ({ ...current, securityDeposit }))} /><NumberField label="Advance amount" value={rentForm.advanceAmount} onChange={(advanceAmount) => setRentForm((current) => current && ({ ...current, advanceAmount }))} /><DateField label="Agreement start" value={rentForm.agreementStartDate} onChange={(agreementStartDate) => setRentForm((current) => current && ({ ...current, agreementStartDate }))} /><DateField label="Agreement end" min={rentForm.agreementStartDate} value={rentForm.agreementEndDate} onChange={(agreementEndDate) => setRentForm((current) => current && ({ ...current, agreementEndDate }))} /></div>
          <label className="block"><span className="mb-2 block text-sm text-slate-300">Rent terms note</span><textarea rows={3} value={rentForm.note} onChange={(event) => setRentForm((current) => current && ({ ...current, note: event.target.value }))} className={`${inputClassName} resize-none`} /></label>
          <label className="block"><span className="mb-2 block text-sm text-slate-300">Rate change note</span><input value={rentForm.rateChangeNote} onChange={(event) => setRentForm((current) => current && ({ ...current, rateChangeNote: event.target.value }))} placeholder="Required context when the base rent changes" className={inputClassName} /></label>
          {(tenancy.rentRateHistory?.length ?? 0) > 0 && <div className="rounded-2xl border border-slate-700 p-4"><h3 className="font-bold">Rent rate history</h3><div className="mt-3 space-y-2">{tenancy.rentRateHistory?.map((history, index) => <div key={`${history.effectiveFrom}-${index}`} className="flex flex-col justify-between gap-1 rounded-xl bg-slate-950/50 px-4 py-3 text-sm sm:flex-row"><span className="font-semibold">৳{history.amount.toLocaleString('en-BD')}</span><span className="text-slate-400">{formatDate(history.effectiveFrom)} — {history.effectiveTo ? formatDate(history.effectiveTo) : 'Current'}</span>{history.note && <span className="text-slate-500">{history.note}</span>}</div>)}</div></div>}
          <ModalError message={error} /><ModalActions saving={isSaving} onCancel={() => setRentOpen(false)} label="Save rent terms" />
        </form>}
      </ManagementModal>
    </>
  );
}

function NumberField({ label, value, onChange, required, min = '0', max, step = '0.01' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; min?: string; max?: string; step?: string }) {
  return <label className="block"><span className="mb-2 block text-sm text-slate-300">{label}{required && ' *'}</span><input type="number" required={required} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} /></label>;
}

function DateField({ label, value, onChange, required, min }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; min?: string }) {
  return <label className="block"><span className="mb-2 block text-sm text-slate-300">{label}{required && ' *'}</span><input type="date" required={required} min={min} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} /></label>;
}

function ModalError({ message }: { message: string }) {
  return message ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{message}</div> : null;
}

function ModalActions({ saving, onCancel, label, disabled = false }: { saving: boolean; onCancel: () => void; label: string; disabled?: boolean }) {
  return <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={saving || disabled} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <FaSpinner className="animate-spin" />}{label}</button></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
