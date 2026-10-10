'use client';

import ManagementModal from '@/components/property/ManagementModal';
import RentBillFormFields from '@/components/rent-bill/RentBillFormFields';
import SubmeterReadingPanel from '@/components/rent-bill/SubmeterReadingPanel';
import { useAuth } from '@/context/AuthContext';
import {
  listActiveOwners,
  listProperties,
  listTenancies,
} from '@/lib/propertyApi';
import {
  createRentBill,
  getRentBillGenerationContext,
} from '@/lib/rentBillApi';
import { isBillableTenancy } from '@/lib/rentBillTenancies';
import type { Property, Tenancy, UserReference } from '@/types/property';
import {
  formatUserName,
  getDocumentId,
} from '@/types/property';
import type {
  RentBillFormPayload,
  RentBillGenerationContext,
} from '@/types/rentBill';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaSpinner,
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const emptyForm: RentBillFormPayload = {
  items: [],
  adjustmentAmount: '0',
  adjustmentNote: '',
  dueDate: '',
  note: '',
};

const getTenancyLabel = (tenancy: Tenancy) => {
  const apartment =
    tenancy.apartmentId && typeof tenancy.apartmentId === 'object'
      ? tenancy.apartmentId.apartmentNumber
      : 'Apartment';
  const tenant =
    tenancy.tenantId && typeof tenancy.tenantId === 'object'
      ? formatUserName(tenancy.tenantId.name)
      : tenancy.tenantId ? 'Tenant' : 'Tenant unavailable';
  return `${apartment} — ${tenant}${tenancy.status === 'ended' ? ' (Ended)' : ''}`;
};

export default function GenerateRentBillPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';

  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [tenancyId, setTenancyId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(currentPeriod);
  const [context, setContext] = useState<RentBillGenerationContext | null>(null);
  const [form, setForm] = useState<RentBillFormPayload>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;

    listActiveOwners()
      .then((result) => {
        if (cancelled) return;
        setOwners(result);
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
    if (!user || !canManage || (isSuperAdmin && !ownerId)) return;
    let cancelled = false;

    listProperties(isSuperAdmin ? { ownerId } : undefined)
      .then((result) => {
        if (cancelled) return;
        setProperties(result);
        setPropertyId('');
        setTenancies([]);
        setTenancyId('');
        setContext(null);
        setForm(emptyForm);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load properties.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManage, isSuperAdmin, ownerId, user]);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    listTenancies({ propertyId, page: 1, limit: 100 })
      .then((result) => {
        if (cancelled) return;
        setTenancies(result.items);
        setTenancyId('');
        setContext(null);
        setForm(emptyForm);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load tenant assignments.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const billableTenancies = useMemo(
    () => tenancies.filter((tenancy) => isBillableTenancy(tenancy, billingPeriod)),
    [tenancies, billingPeriod],
  );

  const subtotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const amount = Number(item.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [form.items],
  );
  const total = subtotal + Number(form.adjustmentAmount || 0);

  const loadContext = async () => {
    if (!billableTenancies.some((tenancy) => tenancy._id === tenancyId) || !billingPeriod) {
      setError('Select a tenant assignment and billing month.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await getRentBillGenerationContext(
        tenancyId,
        billingPeriod,
      );
      setContext(result);
      setForm({
        items: result.items.map((item) => ({
          ...item,
          amount: item.amount === null ? '' : String(item.amount),
        })),
        adjustmentAmount: '0',
        adjustmentNote: '',
        dueDate: result.dueDate.slice(0, 10),
        note: '',
      });
    } catch (requestError) {
      setContext(null);
      setForm(emptyForm);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to prepare the bill.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.items.some((item) => item.amount.trim() === '' && item.key !== 'ELECTRICITY')) {
      setError('Enter an amount for every charge or remove the custom charge.');
      return;
    }

    if (!Number.isFinite(total) || total < 0) {
      setError('Grand total cannot be negative.');
      return;
    }

    setError('');
    setPreviewOpen(true);
  };

  const generateBill = async () => {
    if (!context || isSaving) return;
    setIsSaving(true);

    try {
      const created = await createRentBill(
        context.tenantAssignmentId,
        context.billingPeriod,
        form,
      );
      setPreviewOpen(false);
      await Swal.fire({
        icon: 'success',
        title: 'Rent bill generated',
        text: `${created.receiptNumber} is now visible to the tenant.`,
        confirmButtonText: 'View rent bills',
        heightAuto: false,
        background: '#0f172a',
        color: '#e2e8f0',
        confirmButtonColor: '#4f46e5',
      });
      router.push('/dashboard/rent-bills');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to generate the bill.';
      setError(message);
      await Swal.fire({ icon: 'error', title: 'Receipt was not created', text: message,
        heightAuto: false, background: '#0f172a', color: '#e2e8f0' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) return <PageLoader />;

  if (!user || !canManage) {
    return <AccessDenied />;
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl sm:p-8">
          <Link
            href="/dashboard/rent-bills"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <FaArrowLeft /> Rent bills
          </Link>
          <div className="mt-5 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl text-indigo-300">
              <FaFileInvoiceDollar />
            </span>
            <div>
              <h1 className="text-3xl font-bold">Generate Monthly Rent Bill</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Select a tenancy and month, confirm fixed and variable charges,
                then publish the bill to the tenant.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 sm:grid-cols-2">
          {isSuperAdmin && (
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Owner
              </span>
              <select
                value={ownerId}
                onChange={(event) => {
                  setIsLoading(true);
                  setOwnerId(event.target.value);
                }}
                className={inputClassName}
              >
                <option value="">Select an owner</option>
                {owners.map((owner) => (
                  <option key={getDocumentId(owner)} value={getDocumentId(owner)}>
                    {formatUserName(owner.name)} — {owner.email}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Property
            </span>
            <select
              value={propertyId}
              disabled={isSuperAdmin && !ownerId}
              onChange={(event) => {
                setIsLoading(true);
                setPropertyId(event.target.value);
                setContext(null);
              }}
              className={inputClassName}
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name} — {property.address}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Apartment / Tenant
            </span>
            <select
              value={tenancyId}
              disabled={!propertyId}
              onChange={(event) => {
                setTenancyId(event.target.value);
                setContext(null);
              }}
              className={inputClassName}
            >
              <option value="">Select a tenant assignment</option>
              {billableTenancies.map((tenancy) => (
                <option key={tenancy._id} value={tenancy._id} disabled={!tenancy.tenantId || !tenancy.apartmentId || !tenancy.propertyId || !tenancy.ownerId}>
                  {getTenancyLabel(tenancy)}
                </option>
              ))}
            </select>
            {propertyId && billableTenancies.length === 0 && <p className="mt-2 text-xs text-slate-400">No available tenant assignment for this billing month.</p>}
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Billing month
            </span>
            <div className="relative">
              <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="month"
                value={billingPeriod}
                onChange={(event) => {
                  setBillingPeriod(event.target.value);
                  setTenancyId('');
                  setContext(null);
                }}
                className={`${inputClassName} pl-11`}
              />
            </div>
          </label>

          <div className="flex items-end sm:col-span-2">
            <button
              type="button"
              onClick={() => void loadContext()}
              disabled={!tenancyId || !billingPeriod || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLoading && <FaSpinner className="animate-spin" />}
              Load monthly charges
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {context && (
          <form onSubmit={openPreview} className="mt-6 space-y-6">
            <section className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Summary label="Owner" value={context.owner.name} />
              <Summary label="Tenant" value={context.tenant.name} />
              <Summary label="Property" value={context.property.name} />
              <Summary label="Apartment" value={context.apartment.apartmentNumber} />
            </section>

            {context.submeterRequired && <SubmeterReadingPanel
              key={`${context.apartment.id}:${context.billingPeriod}`}
              apartmentId={context.apartment.id}
              billingPeriod={context.billingPeriod}
              onSaved={(reading) => {
                setContext((value) => value ? { ...value, submeterReading: reading } : value);
                setForm((value) => ({ ...value, items: value.items.map((item) => item.key === 'ELECTRICITY' ? { ...item, amount: String(reading.calculation.totalAmount) } : item) }));
                setError('');
              }}
            />}
            <RentBillFormFields form={form} setForm={setForm} lockElectricity={context.submeterRequired} />

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500"
              >
                Preview bill
              </button>
            </div>
          </form>
        )}
      </div>

      <ManagementModal
        open={previewOpen}
        title="Confirm monthly rent bill"
        onClose={() => !isSaving && setPreviewOpen(false)}
        disableClose={isSaving}
        maxWidthClass="max-w-2xl"
      >
        {context && (
          <div className="space-y-5 p-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm">
              <p className="font-bold text-slate-100">
                {context.property.name} / {context.apartment.apartmentNumber}
              </p>
              <p className="mt-1 text-slate-400">
                {context.tenant.name} · {context.billingPeriod}
              </p>
            </div>

            <div className="divide-y divide-slate-800 rounded-xl border border-slate-700">
              {form.items.map((item) => (
                <div key={item.key} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-semibold text-slate-100">
                    {item.amount.trim() === '' ? '' : `৳${Number(item.amount).toLocaleString('en-BD')}`}
                  </span>
                </div>
              ))}
              {Number(form.adjustmentAmount || 0) !== 0 && (
                <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-slate-300">Adjustment</span>
                  <span className="font-semibold text-slate-100">
                    ৳{Number(form.adjustmentAmount).toLocaleString('en-BD')}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 bg-emerald-500/5 px-4 py-4">
                <span className="font-bold text-slate-100">Grand total</span>
                <span className="text-xl font-black text-emerald-300">
                  ৳{total.toLocaleString('en-BD')}
                </span>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-400">
              Confirming will issue this bill as <strong className="text-amber-300">Due</strong> and make it visible to the tenant.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                disabled={isSaving}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void generateBill()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving && <FaSpinner className="animate-spin" />}
                Generate bill
              </button>
            </div>
          </div>
        )}
      </ManagementModal>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
      <FaSpinner className="animate-spin text-3xl text-indigo-400" />
    </div>
  );
}

function AccessDenied() {
  return (
    <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Only owners and super administrators can generate rent bills.
        </p>
      </div>
    </main>
  );
}
