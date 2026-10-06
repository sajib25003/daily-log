'use client';

import ManagementModal from '@/components/property/ManagementModal';
import { useAuth } from '@/context/AuthContext';
import {
  createApartment,
  createTenancy,
  deleteApartment,
  endTenancy,
  getProperty,
  listAllActiveTenancies,
  listApartments,
  listAssignableTenants,
  updateApartment,
} from '@/lib/propertyApi';
import {
  formatUserName,
  getDocumentId,
} from '@/types/property';
import type {
  Apartment,
  ApartmentFormData,
  MoveOutFormData,
  Property,
  Tenancy,
  TenancyFormData,
  UserReference,
} from '@/types/property';
import Link from 'next/link';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FaArrowLeft,
  FaBuilding,
  FaDoorOpen,
  FaEdit,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaSyncAlt,
  FaTrash,
  FaUserCheck,
  FaUserMinus,
  FaUserPlus,
} from 'react-icons/fa';
import Swal from 'sweetalert2';

type ModalMode = 'create' | 'edit' | 'assign' | 'move-out' | null;

const emptyApartmentForm: ApartmentFormData = {
  apartmentNumber: '',
  note: '',
};

const toLocalDateInputValue = (date = new Date()) => {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const createEmptyTenancyForm = (): TenancyFormData => ({
  tenantId: '',
  startDate: toLocalDateInputValue(),
  note: '',
});

const createEmptyMoveOutForm = (): MoveOutFormData => ({
  endDate: toLocalDateInputValue(),
  moveOutNote: '',
});

const inputClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60';

const getTenantFromTenancy = (tenancy?: Tenancy | null) =>
  tenancy && typeof tenancy.tenantId === 'object'
    ? tenancy.tenantId
    : undefined;

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export default function PropertyApartmentsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PropertyApartmentsContent />
    </Suspense>
  );
}

function PropertyApartmentsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ propertyId: string }>();
  const { user, isAuthLoading } = useAuth();

  const propertyId = params.propertyId;
  const shouldOpenCreateModal = searchParams.get('createApartment') === '1';

  const [property, setProperty] = useState<Property | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<UserReference[]>([]);
  const [activeTenancies, setActiveTenancies] = useState<Tenancy[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>(() =>
    shouldOpenCreateModal ? 'create' : null,
  );
  const [selectedApartment, setSelectedApartment] =
    useState<Apartment | null>(null);
  const [apartmentForm, setApartmentForm] =
    useState<ApartmentFormData>(emptyApartmentForm);
  const [tenancyForm, setTenancyForm] = useState<TenancyFormData>(
    createEmptyTenancyForm,
  );
  const [moveOutForm, setMoveOutForm] = useState<MoveOutFormData>(
    createEmptyMoveOutForm,
  );
  const [isSaving, setIsSaving] = useState(false);

  const canManageApartments =
    user?.role === 'superAdmin' || user?.role === 'owner';

  const loadPageData = async () => {
    if (!propertyId) return;

    const [propertyData, apartmentData] = await Promise.all([
      getProperty(propertyId),
      listApartments(propertyId),
    ]);

    const ownerId = getDocumentId(propertyData.ownerId);

    const [tenantItems, activeTenancyData] = await Promise.all([
      listAssignableTenants(ownerId),
      listAllActiveTenancies({
        ...(user?.role === 'superAdmin' && ownerId ? { ownerId } : {}),
      }),
    ]);

    setProperty(propertyData);
    setApartments(apartmentData.apartments);
    setTenants(tenantItems);
    setActiveTenancies(activeTenancyData);
  };

  useEffect(() => {
    if (!user || !canManageApartments || !propertyId) return;

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const [propertyData, apartmentData] = await Promise.all([
          getProperty(propertyId),
          listApartments(propertyId),
        ]);

        const ownerId = getDocumentId(propertyData.ownerId);
        const [tenantItems, activeTenancyData] = await Promise.all([
          listAssignableTenants(ownerId),
          listAllActiveTenancies({
            ...(user.role === 'superAdmin' && ownerId ? { ownerId } : {}),
          }),
        ]);

        if (cancelled) return;

        setProperty(propertyData);
        setApartments(apartmentData.apartments);
        setTenants(tenantItems);
        setActiveTenancies(activeTenancyData);
        setError('');
      } catch (requestError) {
        if (cancelled) return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Failed to load property apartments.',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [canManageApartments, propertyId, user]);

  const assignedTenantIds = useMemo(
    () =>
      new Set(
        activeTenancies
          .map((tenancy) => getDocumentId(tenancy.tenantId))
          .filter(Boolean),
      ),
    [activeTenancies],
  );

  const availableTenants = useMemo(
    () =>
      tenants.filter(
        (tenant) => !assignedTenantIds.has(getDocumentId(tenant)),
      ),
    [assignedTenantIds, tenants],
  );

  const visibleApartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return apartments;

    return apartments.filter((apartment) => {
      const tenant = getTenantFromTenancy(apartment.currentTenancy);

      return [
        apartment.apartmentNumber,
        apartment.note,
        formatUserName(tenant?.name),
        tenant?.email,
        tenant?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [apartments, search]);

  const occupiedCount = apartments.filter(
    (apartment) => apartment.currentTenancy?.status === 'active',
  ).length;
  const vacantCount = apartments.length - occupiedCount;

  const refreshData = async () => {
    if (isRefreshing || !propertyId) return;

    setIsRefreshing(true);
    setError('');

    try {
      await loadPageData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to refresh apartments.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreateApartment = () => {
    setSelectedApartment(null);
    setApartmentForm(emptyApartmentForm);
    setModalError('');
    setModalMode('create');
  };

  const openEditApartment = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setApartmentForm({
      apartmentNumber: apartment.apartmentNumber,
      note: apartment.note ?? '',
    });
    setModalError('');
    setModalMode('edit');
  };

  const openAssignTenant = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setTenancyForm(createEmptyTenancyForm());
    setModalError('');
    setModalMode('assign');
  };

  const openMoveOut = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setMoveOutForm(createEmptyMoveOutForm());
    setModalError('');
    setModalMode('move-out');
  };

  const closeModal = () => {
    if (isSaving) return;

    setModalMode(null);
    setSelectedApartment(null);
    setApartmentForm(emptyApartmentForm);
    setTenancyForm(createEmptyTenancyForm());
    setMoveOutForm(createEmptyMoveOutForm());
    setModalError('');

    if (shouldOpenCreateModal) {
      router.replace(pathname);
    }
  };

  const handleApartmentSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSaving || !propertyId) return;

    setIsSaving(true);
    setModalError('');

    try {
      const wasEditing = modalMode === 'edit';

      if (wasEditing && selectedApartment) {
        const updatedApartment = await updateApartment(
          selectedApartment._id,
          apartmentForm,
        );

        setApartments((currentApartments) =>
          currentApartments.map((apartment) =>
            apartment._id === updatedApartment._id
              ? {
                  ...updatedApartment,
                  currentTenancy: apartment.currentTenancy,
                }
              : apartment,
          ),
        );
      } else {
        const createdApartment = await createApartment(
          propertyId,
          apartmentForm,
        );

        setApartments((currentApartments) => [
          ...currentApartments,
          { ...createdApartment, currentTenancy: null },
        ]);

        setProperty((currentProperty) =>
          currentProperty
            ? {
                ...currentProperty,
                apartmentCount: (currentProperty.apartmentCount ?? 0) + 1,
              }
            : currentProperty,
        );
      }

      closeModalAfterSave();
      showSuccessToast(wasEditing ? 'Apartment updated.' : 'Apartment created.');
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save apartment.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedApartment || isSaving) return;

    if (!tenancyForm.tenantId) {
      setModalError('Please select a tenant.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const tenancy = await createTenancy(
        selectedApartment._id,
        tenancyForm,
      );

      setApartments((currentApartments) =>
        currentApartments.map((apartment) =>
          apartment._id === selectedApartment._id
            ? { ...apartment, currentTenancy: tenancy }
            : apartment,
        ),
      );
      setActiveTenancies((current) => [tenancy, ...current]);

      closeModalAfterSave();
      showSuccessToast('Tenant assigned successfully.');
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to assign tenant.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveOut = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const tenancyId = selectedApartment?.currentTenancy?._id;

    if (!selectedApartment || !tenancyId || isSaving) return;

    setIsSaving(true);
    setModalError('');

    try {
      await endTenancy(tenancyId, moveOutForm);

      setApartments((currentApartments) =>
        currentApartments.map((apartment) =>
          apartment._id === selectedApartment._id
            ? { ...apartment, currentTenancy: null }
            : apartment,
        ),
      );
      setActiveTenancies((current) =>
        current.filter((tenancy) => tenancy._id !== tenancyId),
      );

      closeModalAfterSave();
      showSuccessToast('Tenant move-out completed.');
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to complete move-out.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const closeModalAfterSave = () => {
    setModalMode(null);
    setSelectedApartment(null);
    setApartmentForm(emptyApartmentForm);
    setTenancyForm(createEmptyTenancyForm());
    setMoveOutForm(createEmptyMoveOutForm());
    setModalError('');

    if (shouldOpenCreateModal) {
      router.replace(pathname);
    }
  };

  const showSuccessToast = (title: string) => {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 1700,
      timerProgressBar: true,
      background: '#0f172a',
      color: '#e2e8f0',
    });
  };

  const handleDeleteApartment = async (apartment: Apartment) => {
    if (apartment.currentTenancy?.status === 'active') {
      setError('End the active tenancy before deleting this apartment.');
      return;
    }

    const confirmation = await Swal.fire({
      title: 'Delete this apartment?',
      text: `${apartment.apartmentNumber} will be archived if tenancy history exists; otherwise it will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete apartment',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      heightAuto: false,
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#334155',
    });

    if (!confirmation.isConfirmed) return;

    try {
      const result = await deleteApartment(apartment._id);

      setApartments((currentApartments) =>
        currentApartments.filter((item) => item._id !== apartment._id),
      );

      setProperty((currentProperty) =>
        currentProperty
          ? {
              ...currentProperty,
              apartmentCount: Math.max(
                0,
                (currentProperty.apartmentCount ?? 1) - 1,
              ),
            }
          : currentProperty,
      );

      showSuccessToast(
        result.deletionType === 'soft'
          ? 'Apartment archived.'
          : 'Apartment permanently deleted.',
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to delete apartment.',
      );
    }
  };

  if (isAuthLoading) {
    return <PageLoader />;
  }

  if (!user || !canManageApartments) {
    return (
      <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            Only super admins and property owners can access apartments.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (!property) {
    return (
      <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-7 text-center">
          <h1 className="text-xl font-bold">Property unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">
            {error || 'The property was not found.'}
          </p>
          <Link
            href="/dashboard/properties"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to properties
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/properties"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <FaArrowLeft />
          All properties
        </Link>

        <section className="rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-indigo-950/30 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                  <FaBuilding />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-300">
                    Property Apartments
                  </p>
                  <h1 className="truncate text-2xl font-bold sm:text-3xl">
                    {property.name}
                  </h1>
                </div>
              </div>

              <p className="mt-4 flex items-start gap-2 text-sm text-slate-300">
                <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-500" />
                {property.address}
              </p>

              {property.note && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  {property.note}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateApartment}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <FaPlus />
                Add Apartment
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3 sm:max-w-2xl">
          <SummaryCard label="Apartments" value={apartments.length} />
          <SummaryCard label="Occupied" value={occupiedCount} tone="occupied" />
          <SummaryCard label="Vacant" value={vacantCount} tone="vacant" />
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl">
          <label className="relative block">
            <span className="sr-only">Search apartments</span>
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search apartment number, tenant or note"
              className={`${inputClassName} pl-10`}
            />
          </label>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {visibleApartments.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
            <FaDoorOpen className="mx-auto text-3xl text-slate-600" />
            <h2 className="mt-4 text-lg font-bold">No apartments found</h2>
            <p className="mt-2 text-sm text-slate-400">
              Register apartment numbers such as 5A, 6A or CW-801.
            </p>
            <button
              type="button"
              onClick={openCreateApartment}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FaPlus />
              Add first apartment
            </button>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleApartments.map((apartment) => {
              const currentTenancy = apartment.currentTenancy;
              const currentTenant = getTenantFromTenancy(currentTenancy);
              const isOccupied = currentTenancy?.status === 'active';

              return (
                <article
                  key={apartment._id}
                  className="flex min-h-72 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl shadow-black/10 transition hover:border-emerald-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                      <FaDoorOpen />
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`mr-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isOccupied
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {isOccupied ? 'Occupied' : 'Vacant'}
                      </span>

                      <button
                        type="button"
                        onClick={() => openEditApartment(apartment)}
                        aria-label={`Edit ${apartment.apartmentNumber}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:text-white"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteApartment(apartment)}
                        disabled={isOccupied}
                        aria-label={`Delete ${apartment.apartmentNumber}`}
                        title={
                          isOccupied
                            ? 'Move the tenant out before deleting'
                            : 'Delete apartment'
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-bold text-slate-100">
                    {apartment.apartmentNumber}
                  </h2>

                  {apartment.note ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                      {apartment.note}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No note added</p>
                  )}

                  <div
                    className={`mt-5 rounded-xl border p-3 ${
                      isOccupied
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    {isOccupied ? (
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                          <FaUserCheck />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {formatUserName(currentTenant?.name)}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {currentTenant?.phone || currentTenant?.email}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Since {formatDate(currentTenancy?.startDate)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <FaUserPlus />
                        No tenant assigned
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      isOccupied
                        ? openMoveOut(apartment)
                        : openAssignTenant(apartment)
                    }
                    className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isOccupied
                        ? 'border border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {isOccupied ? <FaUserMinus /> : <FaUserPlus />}
                    {isOccupied ? 'Move Out' : 'Assign Tenant'}
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <ManagementModal
        open={modalMode === 'create' || modalMode === 'edit'}
        title={modalMode === 'edit' ? 'Edit apartment' : 'Create apartment'}
        onClose={closeModal}
        disableClose={isSaving}
      >
        <form onSubmit={handleApartmentSubmit} className="space-y-5 p-5">
          <SelectedApartmentContext
            property={property}
            apartment={modalMode === 'edit' ? selectedApartment : null}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Apartment number <span className="text-red-400">*</span>
            </span>
            <input
              value={apartmentForm.apartmentNumber}
              onChange={(event) =>
                setApartmentForm((current) => ({
                  ...current,
                  apartmentNumber: event.target.value,
                }))
              }
              placeholder="5A, 6A or CW-801"
              required
              disabled={isSaving}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Note
            </span>
            <textarea
              value={apartmentForm.note}
              onChange={(event) =>
                setApartmentForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={4}
              placeholder="Optional apartment note"
              disabled={isSaving}
              className={`${inputClassName} resize-none`}
            />
          </label>

          <ModalError message={modalError} />
          <ModalActions
            isSaving={isSaving}
            onCancel={closeModal}
            submitLabel={
              modalMode === 'edit' ? 'Save Changes' : 'Create Apartment'
            }
          />
        </form>
      </ManagementModal>

      <ManagementModal
        open={modalMode === 'assign'}
        title="Assign tenant"
        onClose={closeModal}
        disableClose={isSaving}
      >
        <form onSubmit={handleAssignTenant} className="space-y-5 p-5">
          <SelectedApartmentContext
            property={property}
            apartment={selectedApartment}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Tenant <span className="text-red-400">*</span>
            </span>
            <select
              value={tenancyForm.tenantId}
              onChange={(event) =>
                setTenancyForm((current) => ({
                  ...current,
                  tenantId: event.target.value,
                }))
              }
              required
              disabled={isSaving || availableTenants.length === 0}
              className={inputClassName}
            >
              <option value="">Select a tenant</option>
              {availableTenants.map((tenant) => (
                <option key={getDocumentId(tenant)} value={getDocumentId(tenant)}>
                  {formatUserName(tenant.name)}
                  {tenant.phone ? ` — ${tenant.phone}` : ''}
                </option>
              ))}
            </select>
            {availableTenants.length === 0 && (
              <p className="mt-2 text-xs text-amber-300">
                No unassigned active tenant is available. Create a tenant or
                move them out from the previous apartment first.
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Move-in date <span className="text-red-400">*</span>
            </span>
            <input
              type="date"
              value={tenancyForm.startDate}
              max={toLocalDateInputValue()}
              onChange={(event) =>
                setTenancyForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              required
              disabled={isSaving}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Assignment note
            </span>
            <textarea
              rows={3}
              value={tenancyForm.note}
              onChange={(event) =>
                setTenancyForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="Optional note"
              disabled={isSaving}
              className={`${inputClassName} resize-none`}
            />
          </label>

          <ModalError message={modalError} />
          <ModalActions
            isSaving={isSaving}
            onCancel={closeModal}
            submitLabel="Assign Tenant"
            submitDisabled={availableTenants.length === 0}
          />
        </form>
      </ManagementModal>

      <ManagementModal
        open={modalMode === 'move-out'}
        title="Complete tenant move-out"
        onClose={closeModal}
        disableClose={isSaving}
      >
        <form onSubmit={handleMoveOut} className="space-y-5 p-5">
          <SelectedApartmentContext
            property={property}
            apartment={selectedApartment}
          />

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-400">
              Current tenant
            </p>
            <p className="mt-1 font-semibold text-slate-100">
              {formatUserName(
                getTenantFromTenancy(selectedApartment?.currentTenancy)?.name,
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Assigned since{' '}
              {formatDate(selectedApartment?.currentTenancy?.startDate)}
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Move-out date <span className="text-red-400">*</span>
            </span>
            <input
              type="date"
              value={moveOutForm.endDate}
              min={selectedApartment?.currentTenancy?.startDate?.slice(0, 10)}
              max={toLocalDateInputValue()}
              onChange={(event) =>
                setMoveOutForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              required
              disabled={isSaving}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Move-out note
            </span>
            <textarea
              rows={3}
              value={moveOutForm.moveOutNote}
              onChange={(event) =>
                setMoveOutForm((current) => ({
                  ...current,
                  moveOutNote: event.target.value,
                }))
              }
              placeholder="Keys, final meter reading or other note"
              disabled={isSaving}
              className={`${inputClassName} resize-none`}
            />
          </label>

          <ModalError message={modalError} />
          <ModalActions
            isSaving={isSaving}
            onCancel={closeModal}
            submitLabel="Complete Move Out"
            tone="warning"
          />
        </form>
      </ManagementModal>
    </main>
  );
}

function SelectedApartmentContext({
  property,
  apartment,
}: {
  property: Property;
  apartment?: Apartment | null;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Selected location
      </p>
      <p className="mt-1 font-semibold text-slate-200">
        {property.name}
        {apartment ? ` / ${apartment.apartmentNumber}` : ''}
      </p>
      <p className="mt-1 text-xs text-slate-500">{property.address}</p>
    </div>
  );
}

function ModalError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      {message}
    </div>
  );
}

function ModalActions({
  isSaving,
  onCancel,
  submitLabel,
  submitDisabled = false,
  tone = 'primary',
}: {
  isSaving: boolean;
  onCancel: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  tone?: 'primary' | 'warning';
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={isSaving || submitDisabled}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          tone === 'warning'
            ? 'bg-amber-600 hover:bg-amber-500'
            : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {isSaving && <FaSpinner className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'occupied' | 'vacant';
}) {
  const valueClass = {
    default: 'text-slate-100',
    occupied: 'text-amber-300',
    vacant: 'text-emerald-300',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-4 shadow-lg">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
      <div className="text-center">
        <FaSpinner className="mx-auto animate-spin text-2xl text-emerald-400" />
        <p className="mt-3 text-sm text-slate-400">Loading apartments...</p>
      </div>
    </div>
  );
}
