import { apiFetch } from '@/lib/apiClient';
import type {
  ChargeCalculationMode,
  ChargeCategory,
  ElectricityCalculation,
  ElectricityMeterCharge,
  ElectricityProvider,
  ElectricityTariff,
  ElectricityTariffScope,
  ElectricityTariffSlab,
} from '@/types/billing';
import type {
  Apartment,
  ApartmentElectricityBillingType,
  ElectricityMeterPhase,
  ElectricityPaymentResponsibility,
  Property,
  RentTermsFormData,
  Tenancy,
} from '@/types/property';

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

const optionalNumber = (value: string) =>
  value.trim() === '' ? null : Number(value);

export const updateRentTerms = (
  tenancyId: string,
  form: RentTermsFormData,
) =>
  request<Tenancy>(`/tenancies/${tenancyId}/rent-terms`, {
    method: 'PATCH',
    body: JSON.stringify({
      rentTerms: {
        baseRent: Number(form.baseRent),
        dueDay: Number(form.dueDay),
        effectiveFrom: form.effectiveFrom,
        noticePeriod: {
          value: Number(form.noticeValue),
          unit: form.noticeUnit,
        },
        rentRevision: {
          intervalMonths: optionalNumber(form.revisionIntervalMonths),
          nextRevisionDate: form.nextRevisionDate || null,
          note: form.revisionNote.trim() || null,
        },
        securityDeposit: optionalNumber(form.securityDeposit),
        advanceAmount: optionalNumber(form.advanceAmount),
        agreementStartDate: form.agreementStartDate || null,
        agreementEndDate: form.agreementEndDate || null,
        note: form.note.trim() || null,
        rateChangeNote: form.rateChangeNote.trim() || null,
      },
    }),
  });

export const listChargeCategories = (options: {
  propertyId: string;
  includeInactive?: boolean;
}) => {
  const params = new URLSearchParams();
  params.set('propertyId', options.propertyId);
  if (options.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();

  return request<ChargeCategory[]>(
    `/billing/charge-categories${query ? `?${query}` : ''}`,
  );
};

export const createChargeCategory = (payload: {
  propertyId: string;
  name: string;
  code?: string;
  defaultMode: ChargeCalculationMode;
  sortOrder?: number;
}) =>
  request<ChargeCategory>('/billing/charge-categories', {
    method: 'POST',
    body: JSON.stringify({ category: payload }),
  });

export const updateChargeCategory = (
  categoryId: string,
  payload: Partial<
    Pick<
      ChargeCategory,
      'name' | 'defaultMode' | 'isActive' | 'sortOrder'
    >
  >,
) =>
  request<ChargeCategory>(`/billing/charge-categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ category: payload }),
  });

export const listElectricityProviders = (includeInactive = false) =>
  request<ElectricityProvider[]>(
    `/electricity/providers${includeInactive ? '?includeInactive=true' : ''}`,
  );

export const createElectricityProvider = (payload: {
  name: string;
  code: string;
}) =>
  request<ElectricityProvider>('/electricity/providers', {
    method: 'POST',
    body: JSON.stringify({ provider: payload }),
  });

export const updateElectricityProvider = (
  providerId: string,
  payload: { name?: string; isActive?: boolean },
) =>
  request<ElectricityProvider>(`/electricity/providers/${providerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ provider: payload }),
  });

export const listElectricityTariffs = (filters?: {
  providerId?: string;
  scope?: ElectricityTariffScope;
  activeOnly?: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters?.providerId) params.set('providerId', filters.providerId);
  if (filters?.scope) params.set('scope', filters.scope);
  if (filters?.activeOnly === false) params.set('activeOnly', 'false');
  const query = params.toString();

  return request<ElectricityTariff[]>(
    `/electricity/tariffs${query ? `?${query}` : ''}`,
  );
};

export const createElectricityTariff = (payload: {
  name: string;
  scope: ElectricityTariffScope;
  providerId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  lifeline: { maximumUnit: number; rate: number };
  slabs: ElectricityTariffSlab[];
  demandChargePerKw?: number;
  vatPercentage: number;
  meterCharges: ElectricityMeterCharge[];
}) =>
  request<ElectricityTariff>('/electricity/tariffs', {
    method: 'POST',
    body: JSON.stringify({
      tariff: {
        ...payload,
        consumerCategory: 'LT_A_RESIDENTIAL',
      },
    }),
  });

export const deactivateElectricityTariff = (tariffId: string) =>
  request<ElectricityTariff>(`/electricity/tariffs/${tariffId}/deactivate`, {
    method: 'PATCH',
  });

export const calculateElectricityBill = (payload: {
  providerId: string;
  consumedUnit: number;
  applicableDate?: string;
  meterPhase?: ElectricityMeterPhase;
  connectedLoad?: number;
  meterChargeOverride?: number;
  adjustmentAmount?: number;
}) =>
  request<ElectricityCalculation>('/electricity/calculate', {
    method: 'POST',
    body: JSON.stringify({
      calculation: {
        ...payload,
        consumerCategory: 'LT_A_RESIDENTIAL',
      },
    }),
  });

export const updatePropertyElectricitySettings = (
  propertyId: string,
  payload: {
    providerId: string;
    accountNumber?: string | null;
    defaultMeterPhase?: ElectricityMeterPhase;
  },
) =>
  request<Property>(`/properties/${propertyId}/electricity-settings`, {
    method: 'PATCH',
    body: JSON.stringify({
      electricitySettings: {
        ...payload,
        consumerCategory: 'LT_A_RESIDENTIAL',
      },
    }),
  });

export const updateApartmentElectricityConfig = (
  apartmentId: string,
  payload: {
    billingType: ApartmentElectricityBillingType;
    paymentResponsibility?: ElectricityPaymentResponsibility;
    meterNumber?: string | null;
    note?: string | null;
  },
) =>
  request<Apartment>(`/apartments/${apartmentId}/electricity-config`, {
    method: 'PATCH',
    body: JSON.stringify({ electricityConfig: payload }),
  });

export const updateApartmentChargeSettings = (
  apartmentId: string,
  charges: Array<{ categoryId: string; amount: number | null }>,
) =>
  request<Apartment>(`/apartments/${apartmentId}/charge-settings`, {
    method: 'PATCH',
    body: JSON.stringify({ chargeSettings: { charges } }),
  });

export const getSubmeterContext = (apartmentId: string, billingPeriod: string) => {
  const params = new URLSearchParams({ apartmentId, billingPeriod });
  return request<import('@/types/submeter').SubmeterContext>(`/electricity/submeter/context?${params}`);
};
export const previewSubmeterReading = (reading: import('@/types/submeter').SubmeterPayload) =>
  request<ElectricityCalculation>('/electricity/submeter/preview', { method: 'POST', body: JSON.stringify({ reading }) });
export const saveSubmeterReading = (reading: import('@/types/submeter').SubmeterPayload) =>
  request<import('@/types/submeter').SubmeterReading>('/electricity/submeter/readings', { method: 'POST', body: JSON.stringify({ reading }) });

export const listSubmeterReadings = (apartmentId: string, year: number) => {
  const params = new URLSearchParams({ apartmentId, year: String(year) });
  return request<import('@/types/submeter').SubmeterReading[]>(`/electricity/submeter/readings?${params}`);
};
