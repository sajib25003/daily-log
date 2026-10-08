import { apiFetch } from '@/lib/apiClient';
import type {
  PaymentMethod,
  RentBill,
  RentBillFormPayload,
  RentBillGenerationContext,
  RentBillListData,
  RentBillStatus,
} from '@/types/rentBill';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await apiFetch(path, {
    ...options,
    headers,
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;

  if (!response.ok) {
    throw new Error(
      result?.message || result?.error || 'The request could not be completed.',
    );
  }

  if (result?.data === undefined) {
    throw new Error('The server returned an empty response.');
  }

  return result.data;
};

const normalizeBillForm = (form: RentBillFormPayload) => ({
  items: form.items.map((item) => ({
    categoryId: item.categoryId || null,
    key: item.key,
    label: item.label.trim(),
    amount: Number(item.amount),
    type: item.type,
  })),
  adjustmentAmount: Number(form.adjustmentAmount || 0),
  adjustmentNote: form.adjustmentNote.trim() || null,
  dueDate: form.dueDate || null,
  note: form.note.trim() || null,
});

export const getRentBillGenerationContext = (
  tenantAssignmentId: string,
  billingPeriod: string,
) => {
  const params = new URLSearchParams({ tenantAssignmentId, billingPeriod });
  return request<RentBillGenerationContext>(
    `/rent-bills/generation-context?${params.toString()}`,
  );
};

export const createRentBill = (
  tenantAssignmentId: string,
  billingPeriod: string,
  form: RentBillFormPayload,
) =>
  request<RentBill>('/rent-bills', {
    method: 'POST',
    body: JSON.stringify({
      bill: {
        tenantAssignmentId,
        billingPeriod,
        ...normalizeBillForm(form),
      },
    }),
  });

export const listRentBills = (filters: {
  year: number;
  ownerId?: string;
  propertyId?: string;
  apartmentId?: string;
  tenantId?: string;
  status?: RentBillStatus | '';
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams({ year: String(filters.year) });
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  if (filters.propertyId) params.set('propertyId', filters.propertyId);
  if (filters.apartmentId) params.set('apartmentId', filters.apartmentId);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return request<RentBillListData>(`/rent-bills?${params.toString()}`);
};

export const getRentBill = (billId: string) =>
  request<RentBill>(`/rent-bills/${billId}`);

export const updateRentBill = (
  billId: string,
  form: RentBillFormPayload,
) =>
  request<RentBill>(`/rent-bills/${billId}`, {
    method: 'PATCH',
    body: JSON.stringify({ bill: normalizeBillForm(form) }),
  });

export const updateRentBillStatus = (
  billId: string,
  payload: {
    status: RentBillStatus;
    paidAt?: string | null;
    paymentMethod?: PaymentMethod | null;
    paymentNote?: string | null;
    reason?: string | null;
  },
) =>
  request<RentBill>(`/rent-bills/${billId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ statusUpdate: payload }),
  });
