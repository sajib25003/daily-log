'use client';

import ManagementModal from '@/components/property/ManagementModal';
import { useAuth } from '@/context/AuthContext';
import { listActiveOwners } from '@/lib/propertyApi';
import {
  createChargeCategory,
  listChargeCategories,
  updateChargeCategory,
} from '@/lib/rentApi';
import type {
  ChargeCalculationMode,
  ChargeCategory,
} from '@/types/billing';
import { formatUserName, getDocumentId } from '@/types/property';
import type { UserReference } from '@/types/property';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FaEdit,
  FaPlus,
  FaReceipt,
  FaSpinner,
  FaSyncAlt,
  FaToggleOff,
  FaToggleOn,
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const MODE_OPTIONS: Array<{
  value: ChargeCalculationMode;
  label: string;
}> = [
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'monthlyVariable', label: 'Monthly variable' },
  { value: 'submeter', label: 'Submeter calculation' },
  { value: 'includedInRent', label: 'Included in rent' },
  { value: 'tenantManaged', label: 'Tenant pays directly' },
  { value: 'notApplicable', label: 'Not applicable' },
];

type CategoryForm = {
  name: string;
  code: string;
  defaultMode: ChargeCalculationMode;
  defaultAmount: string;
  sortOrder: string;
};

const emptyForm: CategoryForm = {
  name: '',
  code: '',
  defaultMode: 'fixed',
  defaultAmount: '',
  sortOrder: '100',
};

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60';

const money = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
});

export default function RentSettingsPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';

  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [categories, setCategories] = useState<ChargeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [editing, setEditing] = useState<ChargeCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!user || !canManage) return;
    if (isSuperAdmin && !ownerId) {
      setCategories([]);
      return;
    }

    const result = await listChargeCategories({
      ...(isSuperAdmin ? { ownerId } : {}),
      includeInactive: true,
    });
    setCategories(result);
  }, [canManage, isSuperAdmin, ownerId, user]);

  useEffect(() => {
    if (!user || !canManage) return;

    let cancelled = false;

    const initialize = async () => {
      try {
        if (isSuperAdmin) {
          const result = await listActiveOwners();
          if (cancelled) return;
          setOwners(result);
          setOwnerId((current) => current || getDocumentId(result[0]));
        } else {
          await loadCategories();
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load rent settings.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [canManage, isSuperAdmin, loadCategories, user]);

  useEffect(() => {
    if (!isSuperAdmin || !ownerId) return;

    let cancelled = false;
    listChargeCategories({ ownerId, includeInactive: true })
      .then((result) => {
        if (!cancelled) {
          setCategories(result);
          setError('');
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load charge categories.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, ownerId]);

  const activeCount = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  );

  const refresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      await loadCategories();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to refresh charge categories.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (category: ChargeCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      code: category.code,
      defaultMode: category.defaultMode,
      defaultAmount:
        category.defaultAmount === null || category.defaultAmount === undefined
          ? ''
          : String(category.defaultAmount),
      sortOrder: String(category.sortOrder),
    });
    setModalError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setModalError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setModalError('');

    try {
      const defaultAmount =
        form.defaultAmount.trim() === '' ? null : Number(form.defaultAmount);

      if (editing) {
        const updated = await updateChargeCategory(editing._id, {
          name: form.name.trim(),
          defaultMode: form.defaultMode,
          defaultAmount,
          sortOrder: Number(form.sortOrder),
        });
        setCategories((current) =>
          current.map((category) =>
            category._id === updated._id ? updated : category,
          ),
        );
      } else {
        const created = await createChargeCategory({
          ...(isSuperAdmin ? { ownerId } : {}),
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          defaultMode: form.defaultMode,
          defaultAmount,
          sortOrder: Number(form.sortOrder),
        });
        setCategories((current) => [...current, created]);
      }

      closeModalAfterSave();
      void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: editing ? 'Charge category updated.' : 'Charge category created.',
        showConfirmButton: false,
        timer: 1600,
        background: '#0f172a',
        color: '#e2e8f0',
      });
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save charge category.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const closeModalAfterSave = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setModalError('');
  };

  const toggleStatus = async (category: ChargeCategory) => {
    try {
      const updated = await updateChargeCategory(category._id, {
        isActive: !category.isActive,
      });
      setCategories((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update category status.',
      );
    }
  };

  if (isAuthLoading) return <PageLoader />;

  if (!user || !canManage) {
    return <AccessDenied />;
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-300">Rent configuration</p>
              <h1 className="mt-2 text-3xl font-bold">Charge Categories</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Set which charges are fixed, monthly variable, included in rent,
                tenant-managed or not applicable.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={refresh} disabled={isRefreshing || (isSuperAdmin && !ownerId)} className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50">
                <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button type="button" onClick={openCreate} disabled={isSuperAdmin && !ownerId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
                <FaPlus /> Add category
              </button>
            </div>
          </div>
        </section>

        {isSuperAdmin && (
          <section className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
            <label className="block max-w-md">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Owner</span>
              <select value={ownerId} onChange={(event) => { setIsLoading(true); setOwnerId(event.target.value); }} className={inputClassName}>
                <option value="">Select an owner</option>
                {owners.map((owner) => (
                  <option key={getDocumentId(owner)} value={getDocumentId(owner)}>
                    {formatUserName(owner.name)} — {owner.email}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><FaReceipt /></span>
              <div>
                <h2 className="font-bold">Monthly charge setup</h2>
                <p className="text-xs text-slate-500">{activeCount} active of {categories.length} categories</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center"><FaSpinner className="animate-spin text-2xl text-emerald-400" /></div>
          ) : categories.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-400">{isSuperAdmin && !ownerId ? 'Select an owner to load rent settings.' : 'No charge categories found.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-5 py-3">Charge</th><th className="px-5 py-3">Mode</th><th className="px-5 py-3">Default amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {categories.map((category) => (
                    <tr key={category._id} className={!category.isActive ? 'opacity-55' : ''}>
                      <td className="px-5 py-4"><p className="font-semibold text-slate-100">{category.name}</p><p className="mt-1 text-xs text-slate-500">{category.code}{category.isSystemDefault ? ' · System default' : ' · Custom'}</p></td>
                      <td className="px-5 py-4 text-slate-300">{MODE_OPTIONS.find((option) => option.value === category.defaultMode)?.label}</td>
                      <td className="px-5 py-4 text-slate-300">{category.defaultAmount === null || category.defaultAmount === undefined ? 'Set during billing' : money.format(category.defaultAmount)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(category)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white" aria-label={`Edit ${category.name}`}><FaEdit /></button><button type="button" onClick={() => void toggleStatus(category)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white" aria-label={`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}`}>{category.isActive ? <FaToggleOn className="text-emerald-400" /> : <FaToggleOff />}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ManagementModal open={modalOpen} title={editing ? 'Edit charge category' : 'Add charge category'} onClose={closeModal} disableClose={isSaving}>
        <form onSubmit={submit} className="space-y-5 p-5">
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Name *</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} /></label>
          {!editing && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Code</span><input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="Generated from name if blank" className={inputClassName} /></label>}
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Calculation mode *</span><select value={form.defaultMode} onChange={(event) => setForm((current) => ({ ...current, defaultMode: event.target.value as ChargeCalculationMode }))} className={inputClassName}>{MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Default amount</span><input type="number" min="0" step="0.01" value={form.defaultAmount} onChange={(event) => setForm((current) => ({ ...current, defaultAmount: event.target.value }))} placeholder="Optional" className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Sort order</span><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} className={inputClassName} /></label></div>
          {modalError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{modalError}</div>}
          <div className="flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSaving && <FaSpinner className="animate-spin" />}{editing ? 'Save changes' : 'Create category'}</button></div>
        </form>
      </ManagementModal>
    </main>
  );
}

function PageLoader() {
  return <div className="flex min-h-[70vh] items-center justify-center bg-slate-950"><FaSpinner className="animate-spin text-2xl text-emerald-400" /></div>;
}

function AccessDenied() {
  return <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100"><div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-slate-400">Only SuperAdmin and owner accounts can manage rent settings.</p></div></main>;
}
