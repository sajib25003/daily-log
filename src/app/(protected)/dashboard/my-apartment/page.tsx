'use client';

import { useAuth } from '@/context/AuthContext';
import { getMyCurrentTenancy } from '@/lib/propertyApi';
import type { Tenancy } from '@/types/property';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FaBuilding,
  FaCalendarAlt,
  FaDoorOpen,
  FaHome,
  FaMapMarkerAlt,
  FaSpinner,
  FaSyncAlt,
} from 'react-icons/fa';

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

const getApartment = (tenancy: Tenancy) =>
  typeof tenancy.apartmentId === 'object'
    ? tenancy.apartmentId
    : undefined;

const getProperty = (tenancy: Tenancy) =>
  typeof tenancy.propertyId === 'object' ? tenancy.propertyId : undefined;

export default function MyApartmentPage() {
  const { user, isAuthLoading } = useAuth();
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCurrentTenancy = async () => {
    const result = await getMyCurrentTenancy();
    setTenancy(result);
  };

  useEffect(() => {
    if (!user || user.role !== 'tenant') return;

    let cancelled = false;

    getMyCurrentTenancy()
      .then((result) => {
        if (cancelled) return;
        setTenancy(result);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Failed to load your apartment.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError('');

    try {
      await loadCurrentTenancy();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to refresh your apartment.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isAuthLoading) {
    return <PageLoader />;
  }

  if (!user || user.role !== 'tenant') {
    return (
      <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            This page is available only to tenant accounts.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  const apartment = tenancy ? getApartment(tenancy) : undefined;
  const property = tenancy ? getProperty(tenancy) : undefined;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-indigo-950/30 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                Tenant Portal
              </p>
              <h1 className="mt-2 text-3xl font-bold">My Apartment</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                View the property and apartment currently connected to your
                tenant account.
              </p>
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!tenancy ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center shadow-xl">
            <FaHome className="mx-auto text-4xl text-slate-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-100">
              No apartment assigned
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Your owner has not connected this account to an apartment yet.
              The apartment information will appear here after assignment.
            </p>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/80 shadow-2xl">
            <div className="border-b border-slate-700/60 bg-emerald-500/5 px-6 py-5 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                    <FaDoorOpen />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                      Current apartment
                    </p>
                    <h2 className="mt-1 text-3xl font-bold text-slate-100">
                      {apartment?.apartmentNumber ?? 'Apartment'}
                    </h2>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                  Active Tenancy
                </span>
              </div>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <InformationCard
                icon={<FaBuilding />}
                label="Property"
                value={property?.name ?? 'Property information unavailable'}
              />
              <InformationCard
                icon={<FaCalendarAlt />}
                label="Move-in date"
                value={formatDate(tenancy.startDate)}
              />
              <InformationCard
                icon={<FaMapMarkerAlt />}
                label="Address"
                value={property?.address ?? 'Address unavailable'}
                wide
              />

              {(tenancy.note || apartment?.note) && (
                <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-5 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {tenancy.note || apartment?.note}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InformationCard({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-700/60 bg-slate-950/40 p-5 ${
        wide ? 'sm:col-span-2' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-indigo-300">{icon}</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-200">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
      <div className="text-center">
        <FaSpinner className="mx-auto animate-spin text-2xl text-emerald-400" />
        <p className="mt-3 text-sm text-slate-400">
          Loading your apartment...
        </p>
      </div>
    </div>
  );
}
