import { apiFetch } from '@/lib/apiClient';
import type {
  Apartment,
  ApartmentFormData,
  ApartmentListData,
  MoveOutFormData,
  Property,
  PropertyFormData,
  Tenancy,
  TenancyFormData,
  TenancyListData,
  UserReference,
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

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

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

export const listProperties = (filters?: {
  ownerId?: string;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (filters?.ownerId) searchParams.set('ownerId', filters.ownerId);
  if (filters?.search?.trim()) searchParams.set('search', filters.search.trim());

  const query = searchParams.toString();

  return request<Property[]>(`/properties${query ? `?${query}` : ''}`);
};

export const getProperty = (propertyId: string) =>
  request<Property>(`/properties/${propertyId}`);

export const createProperty = (payload: PropertyFormData) =>
  request<Property>('/properties', {
    method: 'POST',
    body: JSON.stringify({
      property: {
        name: payload.name.trim(),
        address: payload.address.trim(),
        note: payload.note.trim() || null,
        ...(payload.ownerId && { ownerId: payload.ownerId }),
      },
    }),
  });

export const updateProperty = (
  propertyId: string,
  payload: Pick<PropertyFormData, 'name' | 'address' | 'note'>,
) =>
  request<Property>(`/properties/${propertyId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      property: {
        name: payload.name.trim(),
        address: payload.address.trim(),
        note: payload.note.trim() || null,
      },
    }),
  });

export const deleteProperty = (propertyId: string) =>
  request<{
    deletionType: 'hard' | 'soft';
    property: Property;
    apartmentDependencyCount: number;
  }>(`/properties/${propertyId}`, {
    method: 'DELETE',
  });

export const listApartments = (propertyId: string) =>
  request<ApartmentListData>(`/properties/${propertyId}/apartments`);

export const createApartment = (
  propertyId: string,
  payload: ApartmentFormData,
) =>
  request<Apartment>(`/properties/${propertyId}/apartments`, {
    method: 'POST',
    body: JSON.stringify({
      apartment: {
        apartmentNumber: payload.apartmentNumber.trim(),
        note: payload.note.trim() || null,
      },
    }),
  });

export const updateApartment = (
  apartmentId: string,
  payload: ApartmentFormData,
) =>
  request<Apartment>(`/apartments/${apartmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      apartment: {
        apartmentNumber: payload.apartmentNumber.trim(),
        note: payload.note.trim() || null,
      },
    }),
  });

export const deleteApartment = (apartmentId: string) =>
  request<{
    deletionType: 'hard' | 'soft';
    apartment: Apartment;
    tenancyHistoryCount: number;
  }>(`/apartments/${apartmentId}`, {
    method: 'DELETE',
  });

export const listActiveOwners = async () => {
  const users = await request<UserReference[]>('/users');

  return users.filter(
    (user) => user.role === 'owner' && user.userStatus !== 'inactive',
  );
};

export const listAssignableTenants = async (ownerId: string) => {
  const users = await request<UserReference[]>('/users');

  return users.filter(
    (user) =>
      user.role === 'tenant' &&
      user.userStatus !== 'inactive' &&
      getReferenceId(user.ownerId) === ownerId,
  );
};

export const createTenancy = (
  apartmentId: string,
  payload: TenancyFormData,
) =>
  request<Tenancy>('/tenancies', {
    method: 'POST',
    body: JSON.stringify({
      tenancy: {
        apartmentId,
        tenantId: payload.tenantId,
        startDate: payload.startDate,
        note: payload.note.trim() || null,
      },
    }),
  });

export const endTenancy = (
  tenancyId: string,
  payload: MoveOutFormData,
) =>
  request<Tenancy>(`/tenancies/${tenancyId}/end`, {
    method: 'PATCH',
    body: JSON.stringify({
      tenancy: {
        endDate: payload.endDate,
        moveOutNote: payload.moveOutNote.trim() || null,
      },
    }),
  });

export const listTenancies = (filters?: {
  ownerId?: string;
  propertyId?: string;
  apartmentId?: string;
  tenantId?: string;
  status?: 'active' | 'ended';
  page?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();

  if (filters?.ownerId) searchParams.set('ownerId', filters.ownerId);
  if (filters?.propertyId) searchParams.set('propertyId', filters.propertyId);
  if (filters?.apartmentId) {
    searchParams.set('apartmentId', filters.apartmentId);
  }
  if (filters?.tenantId) searchParams.set('tenantId', filters.tenantId);
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.page) searchParams.set('page', filters.page.toString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());

  const query = searchParams.toString();
  return request<TenancyListData>(`/tenancies${query ? `?${query}` : ''}`);
};

export const listActiveTenancies = (
  filters: {
    ownerId?: string;
    propertyId?: string;
    apartmentId?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  } = {},
) =>
  listTenancies({
    ...filters,
    status: 'active',
  });

export const listAllActiveTenancies = async (filters?: {
  ownerId?: string;
  propertyId?: string;
  apartmentId?: string;
  tenantId?: string;
}) => {
  const items: Tenancy[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await listTenancies({
      ...filters,
      status: 'active',
      page,
      limit: 100,
    });

    items.push(...result.items);
    totalPages = result.meta.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
};

export const getMyCurrentTenancy = () =>
  request<Tenancy | null>('/tenancies/my-current');

const getReferenceId = (
  value?: string | { _id?: string; id?: string } | null,
) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id ?? value.id ?? '';
};
