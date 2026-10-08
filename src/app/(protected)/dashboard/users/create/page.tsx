"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaCircleCheck,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaUserPlus,
  FaXmark,
} from "react-icons/fa6";

type UserRole = "superAdmin" | "owner" | "tenant" | "user";
type ActorRole = "superAdmin" | "owner";

type UserName = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
};

type ManagedUser = {
  _id?: string;
  id?: string;
  name: UserName;
  email: string;
  phone?: string;
  role: UserRole;
  userStatus?: "active" | "inactive";
  ownerId?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type UserFormData = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  role: UserRole;
  ownerId: string;
  password: string;
  confirmPassword: string;
};

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;

const getPasswordError = (password: string) => {
  if (!password) {
    return "Password is required.";
  }

  if (PASSWORD_REGEX.test(password)) {
    return "";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (/\s/.test(password)) {
    return "Password cannot contain spaces.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Add at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Add at least one lowercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Add at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Add at least one special character.";
  }

  return "Password does not meet the required format.";
};

const initialFormData: UserFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  role: "tenant",
  ownerId: "",
  password: "",
  confirmPassword: "",
};

const roleLabels: Record<UserRole, string> = {
  superAdmin: "Super Admin",
  owner: "Owner",
  tenant: "Tenant",
  user: "General User",
};

const roleOptionsByActor: Record<ActorRole, UserRole[]> = {
  superAdmin: ["superAdmin", "owner", "tenant", "user"],
  owner: ["tenant"],
};

const inputClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-2 block text-sm font-medium text-slate-300";

const getUserId = (user: ManagedUser) => user._id ?? user.id ?? "";

const getFullName = (name?: UserName) => {
  if (!name) return "Unknown User";

  return [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
};

export default function CreateUserPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [owners, setOwners] = useState<ManagedUser[]>([]);
  const [isOwnersLoading, setIsOwnersLoading] = useState(true);
  const [ownerLoadError, setOwnerLoadError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdUser, setCreatedUser] = useState<ManagedUser | null>(null);

  const actorRole =
    user && ["superAdmin", "owner"].includes(user.role)
      ? (user.role as ActorRole)
      : undefined;
  const canCreateUsers = Boolean(actorRole);
  const canAssignOwner = actorRole === "superAdmin";
  const roleOptions = actorRole ? roleOptionsByActor[actorRole] : [];

  const passwordValidationError = getPasswordError(formData.password);
  const passwordError =
    passwordTouched || formData.password.length > 0
      ? passwordValidationError
      : "";

  const confirmPasswordValidationError = !formData.confirmPassword
    ? "Please re-enter the password."
    : formData.password !== formData.confirmPassword
      ? "Passwords do not match."
      : "";

  const confirmPasswordError = confirmPasswordTouched
    ? confirmPasswordValidationError
    : "";

  const passwordFieldsAreValid =
    !passwordValidationError && !confirmPasswordValidationError;

  useEffect(() => {
    if (!canAssignOwner) return;

    let cancelled = false;

    const loadOwners = async () => {
      try {
        const response = await apiFetch("/users", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => null)) as ApiResponse<
          ManagedUser[]
        > | null;

        if (!response.ok) {
          throw new Error(result?.message || "Failed to load owners.");
        }

        const availableOwners = Array.isArray(result?.data)
          ? result.data.filter(
              (item) =>
                item.role === "owner" &&
                item.userStatus !== "inactive",
            )
          : [];

        if (!cancelled) {
          setOwners(availableOwners);
          setOwnerLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setOwnerLoadError(
            error instanceof Error ? error.message : "Failed to load owners.",
          );
        }
      } finally {
        if (!cancelled) setIsOwnersLoading(false);
      }
    };

    void loadOwners();

    return () => {
      cancelled = true;
    };
  }, [canAssignOwner]);

  const updateField = <K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K],
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === "role" && value !== "tenant" ? { ownerId: "" } : {}),
    }));

    if (formError) setFormError("");
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return "First name and last name are required.";
    }

    if (formData.role === "tenant" && canAssignOwner && !formData.ownerId) {
      return "Please assign an owner to this tenant.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!passwordFieldsAreValid) {
      setPasswordTouched(true);
      setConfirmPasswordTouched(true);
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || null,
          lastName: formData.lastName.trim(),
        },
        email: formData.email.trim().toLowerCase(),
        ...(formData.phone.trim() && { phone: formData.phone.trim() }),
        ...(formData.address.trim() && { address: formData.address.trim() }),
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        role: formData.role,
        provider: "credentials" as const,
        password: formData.password,
        ...(formData.role === "tenant" &&
          formData.ownerId && { ownerId: formData.ownerId }),
      };

      const response = await apiFetch("/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: payload }),
      });

      const result = (await response
        .json()
        .catch(() => null)) as ApiResponse<ManagedUser> | null;

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Failed to create user.",
        );
      }

      const newUser = result?.data;

      setCreatedUser({
        ...(newUser ?? {}),
        name: newUser?.name ?? payload.name,
        email: newUser?.email ?? payload.email,
        phone: newUser?.phone ?? payload.phone,
        role: newUser?.role ?? payload.role,
        userStatus: newUser?.userStatus ?? "active",
        ownerId: newUser?.ownerId ?? payload.ownerId ?? null,
      });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create user. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    setCreatedUser(null);
    router.replace("/dashboard/users");
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <FaSpinner className="animate-spin text-2xl text-indigo-400" />
      </div>
    );
  }

  if (!user || !canCreateUsers) {
    return (
      <main className="min-h-[70vh] bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            You do not have permission to create users.
          </p>
          <Link
            href="/dashboard/users"
            className="mt-5 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            Back to users
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/users"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <FaArrowLeft aria-hidden="true" />
              All users
            </Link>
            <h1 className="text-2xl font-bold sm:text-3xl">Create user</h1>
            <p className="mt-1 text-sm text-slate-400">
              Add a new account and assign its access level.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <FaUserPlus className="text-indigo-400" />
            Creating as {actorRole ? roleLabels[actorRole] : "User"}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/20"
        >
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="font-semibold">Account information</h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <FormField label="First name" required>
              <input
                type="text"
                value={formData.firstName}
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
                autoComplete="given-name"
                required
                disabled={isSubmitting}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Middle name">
              <input
                type="text"
                value={formData.middleName}
                onChange={(event) =>
                  updateField("middleName", event.target.value)
                }
                autoComplete="additional-name"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Last name" required>
              <input
                type="text"
                value={formData.lastName}
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
                autoComplete="family-name"
                required
                disabled={isSubmitting}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
                required
                disabled={isSubmitting}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Phone">
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                autoComplete="tel"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Date of birth">
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(event) =>
                  updateField("dateOfBirth", event.target.value)
                }
                disabled={isSubmitting}
                className={`${inputClassName} scheme-dark`}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Address">
                <textarea
                  value={formData.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  rows={3}
                  disabled={isSubmitting}
                  className={`${inputClassName} resize-none`}
                />
              </FormField>
            </div>
          </div>

          <div className="border-y border-slate-800 bg-slate-950/40 px-5 py-4 sm:px-6">
            <h2 className="font-semibold">Access and security</h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <FormField label="Role" required>
              <select
                value={formData.role}
                onChange={(event) =>
                  updateField("role", event.target.value as UserRole)
                }
                required
                disabled={isSubmitting || roleOptions.length === 1}
                className={inputClassName}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </FormField>

            {formData.role === "tenant" && canAssignOwner && (
              <FormField label="Assign owner" required>
                <select
                  value={formData.ownerId}
                  onChange={(event) =>
                    updateField("ownerId", event.target.value)
                  }
                  required
                  disabled={isSubmitting || isOwnersLoading}
                  className={inputClassName}
                >
                  <option value="">
                    {isOwnersLoading ? "Loading owners..." : "Select owner"}
                  </option>
                  {owners.map((owner) => (
                    <option key={getUserId(owner)} value={getUserId(owner)}>
                      {getFullName(owner.name)} — {owner.email}
                    </option>
                  ))}
                </select>
                {ownerLoadError && (
                  <p className="mt-2 text-xs text-red-400">{ownerLoadError}</p>
                )}
              </FormField>
            )}

            <FormField label="Password" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(event) => {
                    setPasswordTouched(true);
                    updateField("password", event.target.value);
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby="password-feedback"
                  className={`${inputClassName} pr-12 ${
                    passwordError
                      ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p
                id="password-feedback"
                aria-live="polite"
                className={`mt-2 text-xs leading-5 ${
                  passwordError
                    ? "text-red-400"
                    : formData.password && !passwordValidationError
                      ? "text-emerald-400"
                      : "text-slate-500"
                }`}
              >
                {passwordError ||
                  (formData.password && !passwordValidationError
                    ? "Password meets all requirements."
                    : "Minimum 8 characters with uppercase, lowercase, number and special character.")}
              </p>
            </FormField>

            <FormField label="Repeat password" required>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  onBlur={() => setConfirmPasswordTouched(true)}
                  onPaste={(event) => event.preventDefault()}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(confirmPasswordError)}
                  aria-describedby="confirm-password-feedback"
                  className={`${inputClassName} pr-12 ${
                    confirmPasswordError
                      ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide repeated password"
                      : "Show repeated password"
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p
                id="confirm-password-feedback"
                aria-live="polite"
                className={`mt-2 text-xs leading-5 ${
                  confirmPasswordError
                    ? "text-red-400"
                    : confirmPasswordTouched &&
                        formData.confirmPassword &&
                        !confirmPasswordValidationError
                      ? "text-emerald-400"
                      : "text-slate-500"
                }`}
              >
                {confirmPasswordError ||
                  (confirmPasswordTouched &&
                  formData.confirmPassword &&
                  !confirmPasswordValidationError
                    ? "Passwords match."
                    : "Retype the password. Paste is disabled in this field.")}
              </p>
            </FormField>
          </div>

          {formError && (
            <div
              role="alert"
              className="mx-5 mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-6"
            >
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Link
              href="/dashboard/users"
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !passwordFieldsAreValid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaUserPlus />
              )}
              {isSubmitting ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>

      {createdUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="created-user-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between border-b border-slate-800 p-5">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <FaCircleCheck className="text-xl" />
                </span>
                <div>
                  <h2 id="created-user-title" className="font-semibold">
                    User created successfully
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    The new account is ready to use.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSuccessModal}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 outline-none transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <FaXmark />
              </button>
            </div>

            <dl className="space-y-3 p-5 text-sm">
              <UserInfoRow label="Name" value={getFullName(createdUser.name)} />
              <UserInfoRow label="Email" value={createdUser.email} />
              <UserInfoRow label="Phone" value={createdUser.phone || "—"} />
              <UserInfoRow label="Role" value={roleLabels[createdUser.role]} />
              <UserInfoRow
                label="Status"
                value={createdUser.userStatus || "active"}
              />
              {getUserId(createdUser) && (
                <UserInfoRow label="User ID" value={getUserId(createdUser)} />
              )}
            </dl>

            <div className="border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeSuccessModal}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <FaCheck />
                View all users
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type FormFieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

function FormField({ label, required = false, children }: FormFieldProps) {
  return (
    <label>
      <span className={labelClassName}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function UserInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-950/50 px-3 py-2.5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="break-all text-right font-medium text-slate-200">
        {value}
      </dd>
    </div>
  );
}
