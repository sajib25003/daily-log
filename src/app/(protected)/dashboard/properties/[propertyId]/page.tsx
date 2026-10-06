"use client";

import ManagementModal from "@/components/property/ManagementModal";
import { useAuth } from "@/context/AuthContext";
import {
  createApartment,
  deleteApartment,
  getProperty,
  listApartments,
  updateApartment,
} from "@/lib/propertyApi";
import type { Apartment, ApartmentFormData, Property } from "@/types/property";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
} from "react-icons/fa";
import Swal from "sweetalert2";

const emptyApartmentForm: ApartmentFormData = {
  apartmentNumber: "",
  note: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

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
  const shouldOpenCreateModal = searchParams.get("createApartment") === "1";

  const [property, setProperty] = useState<Property | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(() =>
    shouldOpenCreateModal ? "create" : null,
  );
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(
    null,
  );
  const [apartmentForm, setApartmentForm] =
    useState<ApartmentFormData>(emptyApartmentForm);
  const [isSaving, setIsSaving] = useState(false);

  const canManageApartments =
    user?.role === "superAdmin" || user?.role === "owner";

  useEffect(() => {
    if (!user || !canManageApartments || !propertyId) return;

    let cancelled = false;

    Promise.all([getProperty(propertyId), listApartments(propertyId)])
      .then(([propertyData, apartmentData]) => {
        if (cancelled) return;

        setProperty(propertyData);
        setApartments(apartmentData.apartments);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load property apartments.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManageApartments, propertyId, user]);

  const visibleApartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return apartments;

    return apartments.filter((apartment) =>
      [apartment.apartmentNumber, apartment.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [apartments, search]);

  const refreshData = async () => {
    if (isRefreshing || !propertyId) return;

    setIsRefreshing(true);
    setError("");

    try {
      const [propertyData, apartmentData] = await Promise.all([
        getProperty(propertyId),
        listApartments(propertyId),
      ]);

      setProperty(propertyData);
      setApartments(apartmentData.apartments);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to refresh apartments.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreateApartment = () => {
    setEditingApartment(null);
    setApartmentForm(emptyApartmentForm);
    setError("");
    setModalMode("create");
  };

  const openEditApartment = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setApartmentForm({
      apartmentNumber: apartment.apartmentNumber,
      note: apartment.note ?? "",
    });
    setError("");
    setModalMode("edit");
  };

  const closeApartmentModal = () => {
    if (isSaving) return;

    setModalMode(null);
    setEditingApartment(null);
    setApartmentForm(emptyApartmentForm);

    if (shouldOpenCreateModal) {
      router.replace(pathname);
    }
  };

  const handleApartmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving || !propertyId) return;

    setIsSaving(true);
    setError("");

    try {
      const wasEditing = modalMode === "edit";

      if (wasEditing && editingApartment) {
        const updatedApartment = await updateApartment(
          editingApartment._id,
          apartmentForm,
        );

        setApartments((currentApartments) =>
          currentApartments.map((apartment) =>
            apartment._id === updatedApartment._id
              ? updatedApartment
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
          createdApartment,
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

      setModalMode(null);
      setEditingApartment(null);
      setApartmentForm(emptyApartmentForm);

      if (shouldOpenCreateModal) {
        router.replace(pathname);
      }

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: wasEditing ? "Apartment updated." : "Apartment created.",
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save apartment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApartment = async (apartment: Apartment) => {
    const confirmation = await Swal.fire({
      title: "Delete this apartment?",
      text: `${apartment.apartmentNumber} will be permanently deleted.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete apartment",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      heightAuto: false,
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#334155",
    });

    if (!confirmation.isConfirmed) return;

    try {
      await deleteApartment(apartment._id);

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

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Apartment deleted.",
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete apartment.",
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
            {error || "The property was not found."}
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
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
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

        <section className="mt-5 grid grid-cols-2 gap-3 sm:max-w-lg">
          <SummaryCard label="Total apartments" value={apartments.length} />
          <SummaryCard
            label="Search results"
            value={visibleApartments.length}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl">
          <label className="relative block">
            <span className="sr-only">Search apartments</span>
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search apartment number or note"
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
            {visibleApartments.map((apartment) => (
              <article
                key={apartment._id}
                className="flex min-h-48 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl shadow-black/10 transition hover:border-emerald-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                    <FaDoorOpen />
                  </span>

                  <div className="flex gap-1.5">
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
                      aria-label={`Delete ${apartment.apartmentNumber}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-slate-100">
                  {apartment.apartmentNumber}
                </h2>

                {apartment.note ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                    {apartment.note}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No note added</p>
                )}
              </article>
            ))}
          </section>
        )}
      </div>

      <ManagementModal
        open={modalMode !== null}
        title={modalMode === "edit" ? "Edit apartment" : "Create apartment"}
        onClose={closeApartmentModal}
        disableClose={isSaving}
      >
        <form onSubmit={handleApartmentSubmit} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Selected property
            </p>
            <p className="mt-1 font-semibold text-slate-200">{property.name}</p>
            <p className="mt-1 text-xs text-slate-500">{property.address}</p>
          </div>

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

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
            <button
              type="button"
              onClick={closeApartmentModal}
              disabled={isSaving}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSaving && <FaSpinner className="animate-spin" />}
              {modalMode === "edit" ? "Save Changes" : "Create Apartment"}
            </button>
          </div>
        </form>
      </ManagementModal>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-4 shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
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
