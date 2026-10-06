"use client";

import ManagementModal from "@/components/property/ManagementModal";
import { useAuth } from "@/context/AuthContext";
import {
  createProperty,
  deleteProperty,
  listActiveOwners,
  listProperties,
  updateProperty,
} from "@/lib/propertyApi";
import { formatUserName, getDocumentId } from "@/types/property";
import type {
  Property,
  PropertyFormData,
  UserReference,
} from "@/types/property";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
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

const emptyForm: PropertyFormData = {
  name: "",
  address: "",
  note: "",
  ownerId: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const getOwner = (property: Property) =>
  typeof property.ownerId === "object" ? property.ownerId : undefined;

export default function PropertiesPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<UserReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [propertyModalMode, setPropertyModalMode] = useState<
    "create" | "edit" | null
  >(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyForm, setPropertyForm] = useState<PropertyFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [isApartmentSelectorOpen, setIsApartmentSelectorOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const canManageProperties =
    user?.role === "superAdmin" || user?.role === "owner";
  const isSuperAdmin = user?.role === "superAdmin";

  useEffect(() => {
    if (!user || !canManageProperties) return;

    let cancelled = false;

    const propertiesRequest = listProperties();
    const ownersRequest = isSuperAdmin
      ? listActiveOwners()
      : Promise.resolve([] as UserReference[]);

    Promise.all([propertiesRequest, ownersRequest])
      .then(([propertyItems, ownerItems]) => {
        if (cancelled) return;

        setProperties(propertyItems);
        setOwners(ownerItems);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load properties.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManageProperties, isSuperAdmin, user]);

  const visibleProperties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return properties.filter((property) => {
      const ownerId = getDocumentId(property.ownerId);
      const matchesOwner = ownerFilter === "all" || ownerId === ownerFilter;

      if (!matchesOwner) return false;
      if (!normalizedSearch) return true;

      const owner = getOwner(property);
      const searchableText = [
        property.name,
        property.address,
        property.note,
        owner?.email,
        formatUserName(owner?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [ownerFilter, properties, search]);

  const totalApartments = properties.reduce(
    (total, property) => total + (property.apartmentCount ?? 0),
    0,
  );

  const refreshProperties = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError("");

    try {
      setProperties(await listProperties());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to refresh properties.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreateProperty = () => {
    setEditingProperty(null);
    setPropertyForm({
      ...emptyForm,
      ownerId: isSuperAdmin ? "" : (user?.id ?? ""),
    });
    setPropertyModalMode("create");
  };

  const openEditProperty = (property: Property) => {
    setEditingProperty(property);
    setPropertyForm({
      name: property.name,
      address: property.address,
      note: property.note ?? "",
      ownerId: getDocumentId(property.ownerId),
    });
    setPropertyModalMode("edit");
  };

  const closePropertyModal = () => {
    if (isSaving) return;

    setPropertyModalMode(null);
    setEditingProperty(null);
    setPropertyForm(emptyForm);
  };

  const handlePropertySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) return;

    if (
      isSuperAdmin &&
      propertyModalMode === "create" &&
      !propertyForm.ownerId
    ) {
      setError("Please select an owner for the property.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (propertyModalMode === "edit" && editingProperty) {
        const updatedProperty = await updateProperty(editingProperty._id, {
          name: propertyForm.name,
          address: propertyForm.address,
          note: propertyForm.note,
        });

        setProperties((currentProperties) =>
          currentProperties.map((property) =>
            property._id === updatedProperty._id
              ? {
                  ...property,
                  ...updatedProperty,
                  apartmentCount: property.apartmentCount,
                }
              : property,
          ),
        );
      } else {
        const createdProperty = await createProperty(propertyForm);

        const selectedOwner = owners.find(
          (owner) => getDocumentId(owner) === propertyForm.ownerId,
        );

        setProperties((currentProperties) => [
          {
            ...createdProperty,
            ownerId: selectedOwner ?? createdProperty.ownerId ?? user?.id ?? "",
            apartmentCount: 0,
          },
          ...currentProperties,
        ]);
      }

      setPropertyModalMode(null);
      setEditingProperty(null);
      setPropertyForm(emptyForm);

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          propertyModalMode === "edit"
            ? "Property updated."
            : "Property created.",
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
          : "Failed to save property.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProperty = async (property: Property) => {
    const confirmation = await Swal.fire({
      title: "Delete this property?",
      text:
        (property.apartmentCount ?? 0) > 0
          ? `${property.name} has apartment records, so it will be archived.`
          : `${property.name} will be permanently deleted.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete property",
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
      const result = await deleteProperty(property._id);

      setProperties((currentProperties) =>
        currentProperties.filter((item) => item._id !== property._id),
      );

      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          result.deletionType === "soft"
            ? "Property archived."
            : "Property permanently deleted.",
        showConfirmButton: false,
        timer: 1700,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete property.",
      );
    }
  };

  const openApartmentSelector = () => {
    setSelectedPropertyId(properties[0]?._id ?? "");
    setIsApartmentSelectorOpen(true);
  };

  const continueToApartment = () => {
    if (!selectedPropertyId) {
      setError("Create or select a property first.");
      return;
    }

    setIsApartmentSelectorOpen(false);
    router.push(
      `/dashboard/properties/${selectedPropertyId}?createApartment=1`,
    );
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="text-center">
          <FaSpinner className="mx-auto animate-spin text-2xl text-indigo-400" />
          <p className="mt-3 text-sm text-slate-400">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (!user || !canManageProperties) {
    return (
      <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            Only super admins and property owners can access this page.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="text-center">
          <FaSpinner className="mx-auto animate-spin text-2xl text-indigo-400" />
          <p className="mt-3 text-sm text-slate-400">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-indigo-950/30 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                Property Management
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {isSuperAdmin ? "All Properties" : "My Properties"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Create each building as a property, then manage its apartments
                from the property details page.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshProperties}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openApartmentSelector}
                disabled={properties.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaDoorOpen />
                Add Apartment
              </button>

              <button
                type="button"
                onClick={openCreateProperty}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <FaPlus />
                Add Property
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:max-w-lg">
          <SummaryCard label="Properties" value={properties.length} />
          <SummaryCard label="Apartments" value={totalApartments} />
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="relative">
              <span className="sr-only">Search properties</span>
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, address or note"
                className={`${inputClassName} pl-10`}
              />
            </label>

            {isSuperAdmin && (
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className={inputClassName}
              >
                <option value="all">All owners</option>
                {owners.map((owner) => (
                  <option
                    key={getDocumentId(owner)}
                    value={getDocumentId(owner)}
                  >
                    {formatUserName(owner.name)} — {owner.email}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {visibleProperties.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
            <FaBuilding className="mx-auto text-3xl text-slate-600" />
            <h2 className="mt-4 text-lg font-bold">No properties found</h2>
            <p className="mt-2 text-sm text-slate-400">
              Create the first property before registering an apartment.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => {
              const owner = getOwner(property);

              return (
                <article
                  key={property._id}
                  className="flex flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl shadow-black/10 transition hover:border-indigo-500/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                        <FaBuilding />
                      </span>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold">
                          {property.name}
                        </h2>
                        <p className="mt-1 flex items-start gap-2 text-sm text-slate-400">
                          <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-500" />
                          <span>{property.address}</span>
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      {property.apartmentCount ?? 0} apartments
                    </span>
                  </div>

                  {isSuperAdmin && owner && (
                    <p className="mt-4 text-xs text-slate-500">
                      Owner:{" "}
                      <span className="font-medium text-slate-300">
                        {formatUserName(owner.name)}
                      </span>
                    </p>
                  )}

                  {property.note && (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                      {property.note}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Link
                      href={`/dashboard/properties/${property._id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      <FaDoorOpen />
                      Manage Apartments
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEditProperty(property)}
                      aria-label={`Edit ${property.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-indigo-500/40 hover:text-white"
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProperty(property)}
                      aria-label={`Delete ${property.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <ManagementModal
        open={propertyModalMode !== null}
        title={
          propertyModalMode === "edit" ? "Edit property" : "Create property"
        }
        onClose={closePropertyModal}
        disableClose={isSaving}
      >
        <form onSubmit={handlePropertySubmit} className="space-y-5 p-5">
          {isSuperAdmin && propertyModalMode === "create" && (
            <FormField label="Owner" required>
              <select
                value={propertyForm.ownerId}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    ownerId: event.target.value,
                  }))
                }
                required
                disabled={isSaving}
                className={inputClassName}
              >
                <option value="">Select owner</option>
                {owners.map((owner) => (
                  <option
                    key={getDocumentId(owner)}
                    value={getDocumentId(owner)}
                  >
                    {formatUserName(owner.name)} — {owner.email}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Property name" required>
            <input
              value={propertyForm.name}
              onChange={(event) =>
                setPropertyForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Property A"
              required
              disabled={isSaving}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Address" required>
            <input
              value={propertyForm.address}
              onChange={(event) =>
                setPropertyForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="Building address"
              required
              disabled={isSaving}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Note">
            <textarea
              value={propertyForm.note}
              onChange={(event) =>
                setPropertyForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={4}
              placeholder="Optional property note"
              disabled={isSaving}
              className={`${inputClassName} resize-none`}
            />
          </FormField>

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
              onClick={closePropertyModal}
              disabled={isSaving}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {isSaving && <FaSpinner className="animate-spin" />}
              {propertyModalMode === "edit"
                ? "Save Changes"
                : "Create Property"}
            </button>
          </div>
        </form>
      </ManagementModal>

      <ManagementModal
        open={isApartmentSelectorOpen}
        title="Select property"
        onClose={() => setIsApartmentSelectorOpen(false)}
      >
        <div className="space-y-5 p-5">
          <p className="text-sm text-slate-400">
            Select the property where the apartment will be registered.
          </p>

          <select
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name} — {property.address}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
            <button
              type="button"
              onClick={() => setIsApartmentSelectorOpen(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={continueToApartment}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Continue
            </button>
          </div>
        </div>
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

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
