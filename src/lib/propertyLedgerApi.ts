import { apiFetch } from '@/lib/apiClient';
import type {
  ExpenseCategory,
  ExpenseTemplate,
  IncomeStatus,
  LedgerOverview,
  LedgerReport,
  LedgerStatus,
  PropertyExpense,
  PropertyIncome,
  TemplateFrequency,
} from '@/types/propertyLedger';

type ApiResponse<T> = { success?: boolean; message?: string; error?: string; data?: T };

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await apiFetch(path, { ...options, headers, cache: 'no-store' });
  const result = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) throw new Error(result?.message || result?.error || 'The request could not be completed.');
  if (result?.data === undefined) throw new Error('The server returned an empty response.');
  return result.data;
};

const queryString = (values: Record<string, string | boolean | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
};

export const listExpenseCategories = (ownerId?: string, includeInactive = false) =>
  request<ExpenseCategory[]>(`/property-ledger/categories?${queryString({ ownerId, includeInactive })}`);

export const createExpenseCategory = (payload: { ownerId?: string; name: string }) =>
  request<ExpenseCategory>('/property-ledger/categories', { method: 'POST', body: JSON.stringify(payload) });

export const updateExpenseCategory = (categoryId: string, payload: { name?: string; isActive?: boolean }) =>
  request<ExpenseCategory>(`/property-ledger/categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify(payload) });

export type ExpenseTemplatePayload = {
  ownerId?: string;
  propertyId: string;
  apartmentId?: string | null;
  categoryId: string;
  title: string;
  defaultAmount?: number | null;
  frequency: TemplateFrequency;
  months?: number[];
  activeFrom: string;
  activeTo?: string | null;
  dueDay?: number | null;
  note?: string | null;
  isActive?: boolean;
};

export const listExpenseTemplates = (filters: { ownerId?: string; propertyId?: string; includeInactive?: boolean }) =>
  request<ExpenseTemplate[]>(`/property-ledger/templates?${queryString(filters)}`);
export const createExpenseTemplate = (payload: ExpenseTemplatePayload) =>
  request<ExpenseTemplate>('/property-ledger/templates', { method: 'POST', body: JSON.stringify(payload) });
export const updateExpenseTemplate = (id: string, payload: Partial<ExpenseTemplatePayload>) =>
  request<ExpenseTemplate>(`/property-ledger/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteExpenseTemplate = (id: string) =>
  request<ExpenseTemplate>(`/property-ledger/templates/${id}`, { method: 'DELETE' });

export const prepareLedgerMonth = (payload: { ownerId?: string; propertyId: string; period: string }) =>
  request<{ prepared: number; period: string }>('/property-ledger/prepare-month', { method: 'POST', body: JSON.stringify(payload) });
export const getLedgerOverview = (filters: { ownerId?: string; propertyId: string; period: string }) =>
  request<LedgerOverview>(`/property-ledger/overview?${queryString(filters)}`);

export type ExpensePayload = {
  ownerId?: string;
  propertyId: string;
  apartmentId?: string | null;
  categoryId: string;
  period: string;
  expenseDate?: string | null;
  title: string;
  amount?: number | null;
  status?: LedgerStatus;
  note?: string | null;
  paymentMethod?: string | null;
};
export const createLedgerExpense = (payload: ExpensePayload) => request<PropertyExpense>('/property-ledger/expenses', { method: 'POST', body: JSON.stringify(payload) });
export const updateLedgerExpense = (id: string, payload: Partial<ExpensePayload>) => request<PropertyExpense>(`/property-ledger/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteLedgerExpense = (id: string) => request<PropertyExpense>(`/property-ledger/expenses/${id}`, { method: 'DELETE' });

export type IncomePayload = {
  ownerId?: string;
  propertyId: string;
  apartmentId?: string | null;
  period: string;
  receivedDate?: string | null;
  title: string;
  amount: number;
  status?: IncomeStatus;
  note?: string | null;
  paymentMethod?: string | null;
};
export const createLedgerIncome = (payload: IncomePayload) => request<PropertyIncome>('/property-ledger/incomes', { method: 'POST', body: JSON.stringify(payload) });
export const updateLedgerIncome = (id: string, payload: Partial<IncomePayload>) => request<PropertyIncome>(`/property-ledger/incomes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteLedgerIncome = (id: string) => request<PropertyIncome>(`/property-ledger/incomes/${id}`, { method: 'DELETE' });

export const getLedgerReport = (filters: { ownerId?: string; propertyId?: string; startPeriod: string; endPeriod: string }) =>
  request<LedgerReport>(`/property-ledger/report?${queryString(filters)}`);

