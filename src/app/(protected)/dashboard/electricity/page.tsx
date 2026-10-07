'use client';

import ManagementModal from '@/components/property/ManagementModal';
import { useAuth } from '@/context/AuthContext';
import { listProperties } from '@/lib/propertyApi';
import {
  calculateElectricityBill,
  createElectricityProvider,
  createElectricityTariff,
  deactivateElectricityTariff,
  listElectricityProviders,
  listElectricityTariffs,
  updateElectricityProvider,
} from '@/lib/rentApi';
import type {
  ElectricityCalculation,
  ElectricityMeterCharge,
  ElectricityProvider,
  ElectricityTariff,
  ElectricityTariffScope,
  ElectricityTariffSlab,
} from '@/types/billing';
import type { ElectricityMeterPhase } from '@/types/property';
import { getDocumentId } from '@/types/property';
import type { Property } from '@/types/property';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FaBolt,
  FaCalculator,
  FaPlus,
  FaSpinner,
  FaSyncAlt,
  FaToggleOff,
  FaToggleOn,
} from 'react-icons/fa';
import Swal from 'sweetalert2';

type Tab = 'calculator' | 'tariffs' | 'providers';

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60';

const today = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
});

type TariffForm = {
  name: string;
  scope: ElectricityTariffScope;
  providerId: string;
  effectiveFrom: string;
  effectiveTo: string;
  lifelineMaximumUnit: string;
  lifelineRate: string;
  vatPercentage: string;
  slabs: Array<{ fromUnit: string; toUnit: string; rate: string }>;
  meterCharges: Array<{
    meterPhase: ElectricityMeterPhase;
    loadFrom: string;
    loadTo: string;
    amount: string;
  }>;
};

const emptyTariffForm = (): TariffForm => ({
  name: '',
  scope: 'national',
  providerId: '',
  effectiveFrom: today(),
  effectiveTo: '',
  lifelineMaximumUnit: '50',
  lifelineRate: '',
  vatPercentage: '5',
  slabs: [{ fromUnit: '0', toUnit: '', rate: '' }],
  meterCharges: [],
});

export default function ElectricityPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canAccess = isSuperAdmin || user?.role === 'owner';
  const [tab, setTab] = useState<Tab>('calculator');
  const [providers, setProviders] = useState<ElectricityProvider[]>([]);
  const [tariffs, setTariffs] = useState<ElectricityTariff[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerCode, setProviderCode] = useState('');
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [tariffForm, setTariffForm] = useState<TariffForm>(emptyTariffForm);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [calculationForm, setCalculationForm] = useState({
    providerId: '',
    consumedUnit: '',
    applicableDate: today(),
    meterPhase: 'singlePhase' as ElectricityMeterPhase,
    connectedLoad: '',
    meterChargeOverride: '',
    adjustmentAmount: '',
  });
  const [calculation, setCalculation] =
    useState<ElectricityCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const loadData = async () => {
    const [providerItems, tariffItems, propertyItems] = await Promise.all([
      listElectricityProviders(isSuperAdmin),
      listElectricityTariffs({ activeOnly: !isSuperAdmin }),
      isSuperAdmin ? Promise.resolve([] as Property[]) : listProperties(),
    ]);
    setProviders(providerItems);
    setTariffs(tariffItems);
    setProperties(propertyItems);
    const selectedProperty = propertyItems.find(
      (property) => property._id === selectedPropertyId,
    ) ?? propertyItems[0];
    setSelectedPropertyId(selectedProperty?._id ?? '');
    setCalculationForm((current) => ({
      ...current,
      providerId: isSuperAdmin
        ? current.providerId ||
          providerItems.find((provider) => provider.isActive)?._id ||
          ''
        : getDocumentId(selectedProperty?.electricitySettings?.providerId),
    }));
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    let cancelled = false;

    Promise.all([
      listElectricityProviders(isSuperAdmin),
      listElectricityTariffs({ activeOnly: !isSuperAdmin }),
      isSuperAdmin ? Promise.resolve([] as Property[]) : listProperties(),
    ])
      .then(([providerItems, tariffItems, propertyItems]) => {
        if (cancelled) return;
        setProviders(providerItems);
        setTariffs(tariffItems);
        setProperties(propertyItems);
        const selectedProperty = propertyItems[0];
        setSelectedPropertyId(selectedProperty?._id ?? '');
        setCalculationForm((current) => ({
          ...current,
          providerId: isSuperAdmin
            ? current.providerId ||
              providerItems.find((provider) => provider.isActive)?._id ||
              ''
            : getDocumentId(
                selectedProperty?.electricitySettings?.providerId,
              ),
        }));
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load electricity settings.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canAccess, isSuperAdmin, user]);

  const activeProviders = useMemo(
    () => providers.filter((provider) => provider.isActive),
    [providers],
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property._id === selectedPropertyId),
    [properties, selectedPropertyId],
  );

  const selectedPropertyProvider =
    selectedProperty?.electricitySettings?.providerId;

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item._id === propertyId);

    setSelectedPropertyId(propertyId);
    setCalculation(null);
    setCalculationForm((current) => ({
      ...current,
      providerId: getDocumentId(property?.electricitySettings?.providerId),
      meterPhase:
        property?.electricitySettings?.defaultMeterPhase ?? 'singlePhase',
    }));
  };

  const refresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to refresh electricity settings.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const submitCalculation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCalculating(true);
    setError('');
    try {
      const result = await calculateElectricityBill({
        providerId: calculationForm.providerId,
        consumedUnit: Number(calculationForm.consumedUnit),
        applicableDate: calculationForm.applicableDate,
        meterPhase: calculationForm.meterPhase,
        ...(calculationForm.connectedLoad !== '' && {
          connectedLoad: Number(calculationForm.connectedLoad),
        }),
        ...(calculationForm.meterChargeOverride !== '' && {
          meterChargeOverride: Number(calculationForm.meterChargeOverride),
        }),
        ...(calculationForm.adjustmentAmount !== '' && {
          adjustmentAmount: Number(calculationForm.adjustmentAmount),
        }),
      });
      setCalculation(result);
    } catch (requestError) {
      setCalculation(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to calculate electricity bill.',
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');
    try {
      const created = await createElectricityProvider({
        name: providerName.trim(),
        code: providerCode.trim(),
      });
      setProviders((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setProviderModalOpen(false);
      setProviderName('');
      setProviderCode('');
      showToast('Electricity provider created.');
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to create provider.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProvider = async (provider: ElectricityProvider) => {
    try {
      const updated = await updateElectricityProvider(provider._id, {
        isActive: !provider.isActive,
      });
      setProviders((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update provider.',
      );
    }
  };

  const submitTariff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');
    try {
      const slabs: ElectricityTariffSlab[] = tariffForm.slabs.map((slab) => ({
        fromUnit: Number(slab.fromUnit),
        toUnit: slab.toUnit === '' ? null : Number(slab.toUnit),
        rate: Number(slab.rate),
      }));
      const meterCharges: ElectricityMeterCharge[] = tariffForm.meterCharges.map(
        (charge) => ({
          meterPhase: charge.meterPhase,
          loadFrom: charge.loadFrom === '' ? null : Number(charge.loadFrom),
          loadTo: charge.loadTo === '' ? null : Number(charge.loadTo),
          amount: Number(charge.amount),
        }),
      );

      const created = await createElectricityTariff({
        name: tariffForm.name.trim(),
        scope: tariffForm.scope,
        providerId:
          tariffForm.scope === 'providerSpecific'
            ? tariffForm.providerId
            : null,
        effectiveFrom: tariffForm.effectiveFrom,
        effectiveTo: tariffForm.effectiveTo || null,
        lifeline: {
          maximumUnit: Number(tariffForm.lifelineMaximumUnit),
          rate: Number(tariffForm.lifelineRate),
        },
        slabs,
        vatPercentage: Number(tariffForm.vatPercentage),
        meterCharges,
      });
      setTariffs((current) => [created, ...current]);
      setTariffModalOpen(false);
      setTariffForm(emptyTariffForm());
      showToast('New tariff version created.');
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to create tariff.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateTariff = async (tariff: ElectricityTariff) => {
    const confirmation = await Swal.fire({
      title: 'Deactivate this tariff?',
      text: 'It will no longer be selected for new calculations.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
      heightAuto: false,
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) return;

    try {
      const updated = await deactivateElectricityTariff(tariff._id);
      setTariffs((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to deactivate tariff.',
      );
    }
  };

  const updateSlab = (
    index: number,
    field: keyof TariffForm['slabs'][number],
    value: string,
  ) => {
    setTariffForm((current) => ({
      ...current,
      slabs: current.slabs.map((slab, slabIndex) =>
        slabIndex === index ? { ...slab, [field]: value } : slab,
      ),
    }));
  };

  const updateMeterCharge = (
    index: number,
    field: keyof TariffForm['meterCharges'][number],
    value: string,
  ) => {
    setTariffForm((current) => ({
      ...current,
      meterCharges: current.meterCharges.map((charge, chargeIndex) =>
        chargeIndex === index ? { ...charge, [field]: value } : charge,
      ),
    }));
  };

  if (isAuthLoading) return <PageLoader />;
  if (!user || !canAccess) return <AccessDenied />;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-amber-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-amber-950/50 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-semibold text-amber-300">Utility configuration</p><h1 className="mt-2 text-3xl font-bold">Electricity</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Calculate residential bills from the effective tariff. Provider and tariff changes are restricted to SuperAdmin.</p></div>
            <button type="button" onClick={refresh} disabled={isRefreshing} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"><FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/70 p-1.5">
          <TabButton active={tab === 'calculator'} onClick={() => setTab('calculator')} label="Calculator" />
          <TabButton active={tab === 'tariffs'} onClick={() => setTab('tariffs')} label="Tariff schedules" />
          <TabButton active={tab === 'providers'} onClick={() => setTab('providers')} label="Providers" />
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {isLoading ? <div className="flex min-h-64 items-center justify-center"><FaSpinner className="animate-spin text-2xl text-emerald-400" /></div> : (
          <>
            {tab === 'calculator' && (
              <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <form onSubmit={submitCalculation} className="space-y-5 rounded-2xl border border-slate-700/60 bg-slate-900/75 p-5 shadow-xl">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><FaCalculator /></span><div><h2 className="font-bold">Bill calculator</h2><p className="text-xs text-slate-500">Uses the tariff effective on the selected date</p></div></div>
                  {isSuperAdmin ? (
                    <label className="block"><span className="mb-2 block text-sm text-slate-300">Provider *</span><select required value={calculationForm.providerId} onChange={(event) => setCalculationForm((current) => ({ ...current, providerId: event.target.value }))} className={inputClassName}><option value="">Select provider</option>{activeProviders.map((provider) => <option key={provider._id} value={provider._id}>{provider.name} ({provider.code})</option>)}</select></label>
                  ) : (
                    <div className="space-y-3">
                      <label className="block"><span className="mb-2 block text-sm text-slate-300">Property *</span><select required value={selectedPropertyId} onChange={(event) => selectProperty(event.target.value)} className={inputClassName}><option value="">Select property</option>{properties.map((property) => <option key={property._id} value={property._id}>{property.name} — {property.address}</option>)}</select></label>
                      <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm">
                        <span className="text-slate-500">Provider: </span>
                        <span className="font-semibold text-slate-200">
                          {selectedPropertyProvider && typeof selectedPropertyProvider === 'object'
                            ? `${selectedPropertyProvider.name} (${selectedPropertyProvider.code})`
                            : 'Not configured for this property'}
                        </span>
                      </div>
                      {!calculationForm.providerId && selectedPropertyId && (
                        <p className="text-xs text-amber-300">Configure the property electricity provider before calculating a bill.</p>
                      )}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm text-slate-300">Consumed unit *</span><input required type="number" min="0" step="0.01" value={calculationForm.consumedUnit} onChange={(event) => setCalculationForm((current) => ({ ...current, consumedUnit: event.target.value }))} className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Applicable date *</span><input required type="date" value={calculationForm.applicableDate} onChange={(event) => setCalculationForm((current) => ({ ...current, applicableDate: event.target.value }))} className={inputClassName} /></label></div>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm text-slate-300">Meter phase</span><select value={calculationForm.meterPhase} onChange={(event) => setCalculationForm((current) => ({ ...current, meterPhase: event.target.value as ElectricityMeterPhase }))} className={inputClassName}><option value="singlePhase">Single phase</option><option value="threePhase">Three phase</option></select></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Connected load</span><input type="number" min="0" step="0.01" value={calculationForm.connectedLoad} onChange={(event) => setCalculationForm((current) => ({ ...current, connectedLoad: event.target.value }))} className={inputClassName} /></label></div>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm text-slate-300">Meter charge override</span><input type="number" min="0" step="0.01" value={calculationForm.meterChargeOverride} onChange={(event) => setCalculationForm((current) => ({ ...current, meterChargeOverride: event.target.value }))} placeholder="Use tariff default" className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Adjustment</span><input type="number" step="0.01" value={calculationForm.adjustmentAmount} onChange={(event) => setCalculationForm((current) => ({ ...current, adjustmentAmount: event.target.value }))} placeholder="Can be negative" className={inputClassName} /></label></div>
                  <button type="submit" disabled={isCalculating || !calculationForm.providerId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60">{isCalculating ? <FaSpinner className="animate-spin" /> : <FaBolt />} Calculate bill</button>
                </form>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/75 p-5 shadow-xl">
                  {!calculation ? <div className="flex min-h-80 flex-col items-center justify-center text-center"><FaBolt className="text-4xl text-slate-700" /><h2 className="mt-4 font-bold">No calculation yet</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Select a provider, enter the consumed units and calculate to see the tariff breakdown.</p></div> : <CalculationResult calculation={calculation} />}
                </div>
              </section>
            )}

            {tab === 'providers' && (
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4"><div><h2 className="font-bold">Electricity providers</h2><p className="text-xs text-slate-500">{activeProviders.length} active provider(s)</p></div>{isSuperAdmin && <button type="button" onClick={() => { setModalError(''); setProviderModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500"><FaPlus /> Add provider</button>}</div>
                <div className="divide-y divide-slate-800">{providers.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">No providers found.</p> : providers.map((provider) => <div key={provider._id} className={`flex items-center justify-between gap-4 px-5 py-4 ${!provider.isActive ? 'opacity-55' : ''}`}><div><p className="font-semibold">{provider.name}</p><p className="mt-1 text-xs text-slate-500">{provider.code}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{provider.isActive ? 'Active' : 'Inactive'}</span>{isSuperAdmin && <button type="button" onClick={() => void toggleProvider(provider)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800" aria-label={`${provider.isActive ? 'Deactivate' : 'Activate'} ${provider.name}`}>{provider.isActive ? <FaToggleOn className="text-emerald-400" /> : <FaToggleOff />}</button>}</div></div>)}</div>
              </section>
            )}

            {tab === 'tariffs' && (
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4"><div><h2 className="font-bold">Tariff schedules</h2><p className="text-xs text-slate-500">Versioned residential electricity rates</p></div>{isSuperAdmin && <button type="button" onClick={() => { setTariffForm(emptyTariffForm()); setModalError(''); setTariffModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500"><FaPlus /> New tariff</button>}</div>
                <div className="divide-y divide-slate-800">{tariffs.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">No tariff schedule found.</p> : tariffs.map((tariff) => <TariffRow key={tariff._id} tariff={tariff} isSuperAdmin={isSuperAdmin} onDeactivate={() => void deactivateTariff(tariff)} />)}</div>
              </section>
            )}
          </>
        )}
      </div>

      <ManagementModal open={providerModalOpen} title="Add electricity provider" onClose={() => !isSaving && setProviderModalOpen(false)} disableClose={isSaving}>
        <form onSubmit={submitProvider} className="space-y-5 p-5"><label className="block"><span className="mb-2 block text-sm text-slate-300">Provider name *</span><input required value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="Dhaka Electric Supply Company" className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Code *</span><input required value={providerCode} onChange={(event) => setProviderCode(event.target.value)} placeholder="DESCO" className={inputClassName} /></label><ModalError message={modalError} /><ModalButtons saving={isSaving} onCancel={() => setProviderModalOpen(false)} label="Create provider" /></form>
      </ManagementModal>

      <ManagementModal open={tariffModalOpen} title="Create tariff version" onClose={() => !isSaving && setTariffModalOpen(false)} disableClose={isSaving} maxWidthClass="max-w-4xl">
        <form onSubmit={submitTariff} className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm text-slate-300">Tariff name *</span><input required value={tariffForm.name} onChange={(event) => setTariffForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Scope *</span><select value={tariffForm.scope} onChange={(event) => setTariffForm((current) => ({ ...current, scope: event.target.value as ElectricityTariffScope, providerId: '' }))} className={inputClassName}><option value="national">National</option><option value="providerSpecific">Provider specific</option></select></label></div>
          {tariffForm.scope === 'providerSpecific' && <label className="block"><span className="mb-2 block text-sm text-slate-300">Provider *</span><select required value={tariffForm.providerId} onChange={(event) => setTariffForm((current) => ({ ...current, providerId: event.target.value }))} className={inputClassName}><option value="">Select provider</option>{activeProviders.map((provider) => <option key={provider._id} value={provider._id}>{provider.name}</option>)}</select></label>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm text-slate-300">Effective from *</span><input required type="date" value={tariffForm.effectiveFrom} onChange={(event) => setTariffForm((current) => ({ ...current, effectiveFrom: event.target.value }))} className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Effective to</span><input type="date" min={tariffForm.effectiveFrom} value={tariffForm.effectiveTo} onChange={(event) => setTariffForm((current) => ({ ...current, effectiveTo: event.target.value }))} className={inputClassName} /></label></div>
          <div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="mb-2 block text-sm text-slate-300">Lifeline max unit *</span><input required type="number" min="1" value={tariffForm.lifelineMaximumUnit} onChange={(event) => setTariffForm((current) => ({ ...current, lifelineMaximumUnit: event.target.value }))} className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">Lifeline rate *</span><input required type="number" min="0" step="0.0001" value={tariffForm.lifelineRate} onChange={(event) => setTariffForm((current) => ({ ...current, lifelineRate: event.target.value }))} className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm text-slate-300">VAT % *</span><input required type="number" min="0" max="100" step="0.01" value={tariffForm.vatPercentage} onChange={(event) => setTariffForm((current) => ({ ...current, vatPercentage: event.target.value }))} className={inputClassName} /></label></div>

          <fieldset className="rounded-2xl border border-slate-700 p-4"><div className="flex items-center justify-between"><legend className="font-bold">Energy slabs</legend><button type="button" onClick={() => setTariffForm((current) => ({ ...current, slabs: [...current.slabs, { fromUnit: '', toUnit: '', rate: '' }] }))} className="text-sm font-semibold text-emerald-300">+ Add slab</button></div><p className="mt-1 text-xs text-slate-500">First slab must start at 0. Leave the last “To” blank for unlimited.</p><div className="mt-4 space-y-3">{tariffForm.slabs.map((slab, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"><input required type="number" min="0" value={slab.fromUnit} onChange={(event) => updateSlab(index, 'fromUnit', event.target.value)} placeholder="From" className={inputClassName} /><input type="number" min="0" value={slab.toUnit} onChange={(event) => updateSlab(index, 'toUnit', event.target.value)} placeholder="To / blank" className={inputClassName} /><input required type="number" min="0" step="0.0001" value={slab.rate} onChange={(event) => updateSlab(index, 'rate', event.target.value)} placeholder="Rate" className={inputClassName} /><button type="button" disabled={tariffForm.slabs.length === 1} onClick={() => setTariffForm((current) => ({ ...current, slabs: current.slabs.filter((_, slabIndex) => slabIndex !== index) }))} className="rounded-lg px-3 text-red-400 disabled:opacity-30">×</button></div>)}</div></fieldset>

          <fieldset className="rounded-2xl border border-slate-700 p-4"><div className="flex items-center justify-between"><legend className="font-bold">Meter charges</legend><button type="button" onClick={() => setTariffForm((current) => ({ ...current, meterCharges: [...current.meterCharges, { meterPhase: 'singlePhase', loadFrom: '', loadTo: '', amount: '' }] }))} className="text-sm font-semibold text-emerald-300">+ Add charge</button></div><div className="mt-4 space-y-3">{tariffForm.meterCharges.length === 0 ? <p className="text-sm text-slate-500">No meter charges configured.</p> : tariffForm.meterCharges.map((charge, index) => <div key={index} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2"><select value={charge.meterPhase} onChange={(event) => updateMeterCharge(index, 'meterPhase', event.target.value)} className={inputClassName}><option value="singlePhase">Single phase</option><option value="threePhase">Three phase</option></select><input type="number" min="0" value={charge.loadFrom} onChange={(event) => updateMeterCharge(index, 'loadFrom', event.target.value)} placeholder="Load from" className={inputClassName} /><input type="number" min="0" value={charge.loadTo} onChange={(event) => updateMeterCharge(index, 'loadTo', event.target.value)} placeholder="Load to" className={inputClassName} /><input required type="number" min="0" step="0.01" value={charge.amount} onChange={(event) => updateMeterCharge(index, 'amount', event.target.value)} placeholder="Amount" className={inputClassName} /><button type="button" onClick={() => setTariffForm((current) => ({ ...current, meterCharges: current.meterCharges.filter((_, chargeIndex) => chargeIndex !== index) }))} className="rounded-lg px-3 text-red-400">×</button></div>)}</div></fieldset>
          <ModalError message={modalError} /><ModalButtons saving={isSaving} onCancel={() => setTariffModalOpen(false)} label="Create tariff version" />
        </form>
      </ManagementModal>
    </main>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>{label}</button>;
}

function CalculationResult({ calculation }: { calculation: ElectricityCalculation }) {
  return <div><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">Tariff applied</p><h2 className="mt-1 text-xl font-bold">{calculation.tariff.name}</h2><p className="mt-1 text-xs text-slate-500">VAT {calculation.tariff.vatPercentage}%</p></div><div className="text-right"><p className="text-xs uppercase tracking-wider text-emerald-400">Total</p><p className="mt-1 text-2xl font-bold text-emerald-300">{money.format(calculation.totalAmount)}</p></div></div><div className="mt-5 overflow-hidden rounded-xl border border-slate-700"><table className="w-full text-sm"><thead className="bg-slate-950/60 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">Slab</th><th className="px-4 py-3 text-right">Unit</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-800">{calculation.breakdown.map((item) => <tr key={item.label}><td className="px-4 py-3 text-slate-300">{item.label}</td><td className="px-4 py-3 text-right">{item.unit}</td><td className="px-4 py-3 text-right">{item.rate}</td><td className="px-4 py-3 text-right">{money.format(item.amount)}</td></tr>)}</tbody></table></div><div className="mt-5 space-y-2 text-sm"><ResultLine label="Energy charge" value={calculation.energyCharge} /><ResultLine label="Meter charge" value={calculation.meterCharge} /><ResultLine label="VAT" value={calculation.vatAmount} /><ResultLine label="Adjustment" value={calculation.adjustmentAmount} /><div className="border-t border-slate-700 pt-3"><ResultLine label="Payable total" value={calculation.totalAmount} strong /></div></div></div>;
}

function ResultLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between ${strong ? 'font-bold text-emerald-300' : 'text-slate-300'}`}><span>{label}</span><span>{money.format(value)}</span></div>;
}

function TariffRow({ tariff, isSuperAdmin, onDeactivate }: { tariff: ElectricityTariff; isSuperAdmin: boolean; onDeactivate: () => void }) {
  const provider = tariff.providerId && typeof tariff.providerId === 'object' ? tariff.providerId : null;
  return <div className={`px-5 py-5 ${!tariff.isActive ? 'opacity-55' : ''}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{tariff.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tariff.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{tariff.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-2 text-sm text-slate-400">{tariff.scope === 'national' ? 'National tariff' : `${provider?.name ?? 'Provider-specific'} tariff`} · Effective {formatDate(tariff.effectiveFrom)}{tariff.effectiveTo ? ` to ${formatDate(tariff.effectiveTo)}` : ''}</p><p className="mt-2 text-xs text-slate-500">Lifeline 0–{tariff.lifeline.maximumUnit} at {tariff.lifeline.rate}/unit · {tariff.slabs.length} slab(s) · VAT {tariff.vatPercentage}%</p></div>{isSuperAdmin && tariff.isActive && <button type="button" onClick={onDeactivate} className="w-fit rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20">Deactivate</button>}</div></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function ModalError({ message }: { message: string }) {
  return message ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{message}</div> : null;
}

function ModalButtons({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{saving && <FaSpinner className="animate-spin" />}{label}</button></div>;
}

function showToast(title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title, showConfirmButton: false, timer: 1600, background: '#0f172a', color: '#e2e8f0' });
}

function PageLoader() {
  return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-2xl text-emerald-400" /></div>;
}

function AccessDenied() {
  return <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100"><div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-slate-400">Only SuperAdmin and owner accounts can access electricity settings.</p></div></main>;
}
