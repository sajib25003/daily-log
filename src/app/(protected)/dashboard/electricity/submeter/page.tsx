'use client';

import SubmeterHistory from '@/components/rent-bill/SubmeterHistory';
import SubmeterReadingPanel from '@/components/rent-bill/SubmeterReadingPanel';
import { useAuth } from '@/context/AuthContext';
import {
  listActiveOwners,
  listApartments,
  listProperties,
} from '@/lib/propertyApi';
import { formatUserName, getDocumentId } from '@/types/property';
import type { Apartment, Property, UserReference } from '@/types/property';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-50';
const currentPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
};

export default function SubmeterPage() {
  const { user, isAuthLoading } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';
  const canManage = isSuperAdmin || user?.role === 'owner';
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentId, setApartmentId] = useState('');
  const [period, setPeriod] = useState(currentPeriod);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    listActiveOwners()
      .then((result) => {
        if (!cancelled) setOwners(result);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load owners.',
          );
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
        if (!cancelled) {
          setProperties(result);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load properties.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [user, canManage, isSuperAdmin, ownerId]);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    listApartments(propertyId)
      .then((result) => {
        if (!cancelled) {
          setApartments(
            result.apartments.filter(
              (apartment) =>
                apartment.electricityConfig?.billingType === 'submeter' &&
                apartment.electricityConfig.paymentResponsibility ===
                  'ownerCollects',
            ),
          );
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load apartments.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (isAuthLoading)
    return (
      <main className="min-h-[70vh] bg-slate-950 p-8 text-slate-400">
        Loading…
      </main>
    );
  if (!user || !canManage)
    return (
      <main className="min-h-[70vh] bg-slate-950 p-8 text-red-300">
        Access denied. Only owners and super administrators can manage submeter
        readings.
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-7 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/electricity" className="text-sm text-indigo-300">
          ← Electricity
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Apartment Submeter Readings</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Property ও apartment select করে মাসের reading save করুন। Reading
          meter-এর সাথে থাকে—tenant change বা vacant হলেও হিসাব চলমান থাকে। Rent
          bill তৈরি করলে এই মাসের saved amount automatically আসবে।
        </p>
        <section className="mt-6 grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {isSuperAdmin && (
            <label className="text-xs text-slate-400">
              Owner
              <select
                value={ownerId}
                onChange={(event) => {
                  setOwnerId(event.target.value);
                  setProperties([]);
                  setPropertyId('');
                  setApartments([]);
                  setApartmentId('');
                  setSavedMessage('');
                }}
                className={inputClass}
              >
                <option value="">Select owner</option>
                {owners.map((owner) => (
                  <option
                    key={getDocumentId(owner)}
                    value={getDocumentId(owner)}
                  >
                    {formatUserName(owner.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-xs text-slate-400">
            Property
            <select
              value={propertyId}
              disabled={isSuperAdmin && !ownerId}
              onChange={(event) => {
                setPropertyId(event.target.value);
                setApartments([]);
                setApartmentId('');
                setSavedMessage('');
              }}
              className={inputClass}
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Apartment
            <select
              value={apartmentId}
              disabled={!propertyId}
              onChange={(event) => {
                setApartmentId(event.target.value);
                setSavedMessage('');
              }}
              className={inputClass}
            >
              <option value="">Select submeter apartment</option>
              {apartments.map((apartment) => (
                <option key={apartment._id} value={apartment._id}>
                  {apartment.apartmentNumber} ·{' '}
                  {apartment.electricityConfig?.meterNumber ||
                    'Meter number missing'}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Billing month
            <input
              type="month"
              value={period}
              max={currentPeriod()}
              onChange={(event) => {
                setPeriod(event.target.value);
                setSavedMessage('');
              }}
              className={inputClass}
            />
          </label>
        </section>
        {propertyId && apartments.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            No submeter apartments loaded. In Properties & Apartments, set
            electricity billing to Submeter, payment to Owner collects and enter
            the meter number.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {apartmentId && period && (
          <div className="mt-6">
            <SubmeterReadingPanel
              key={`${apartmentId}:${period}`}
              apartmentId={apartmentId}
              billingPeriod={period}
              onSaved={(reading) => {
                setSavedMessage(
                  reading.syncWarning ||
                    'Apartment bill saved. This month’s rent details update automatically.',
                );
                setHistoryRefresh((value) => value + 1);
              }}
            />
          </div>
        )}
        {apartmentId && period && (
          <SubmeterHistory
            apartmentId={apartmentId}
            year={Number(period.slice(0, 4))}
            refresh={historyRefresh}
            onSelect={(value) => {
              setPeriod(value);
              setSavedMessage('');
            }}
          />
        )}
        {savedMessage && (
          <p role="status" className="mt-4 text-sm text-emerald-300">
            {savedMessage}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/rent-bills/generate"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold"
          >
            Generate rent bill →
          </Link>
          <Link
            href="/dashboard/properties"
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-indigo-300"
          >
            Property & apartment settings
          </Link>
        </div>
      </div>
    </main>
  );
}
