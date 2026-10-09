import type { Tenancy } from '@/types/property';

export const isBillableTenancy = (tenancy: Tenancy, billingPeriod: string) => {
  if (!tenancy.tenantId || !tenancy.apartmentId || !tenancy.propertyId || !tenancy.ownerId) return false;
  if (typeof tenancy.tenantId === 'object' && tenancy.tenantId.isDeleted) return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)) return false;
  const [year, month] = billingPeriod.split('-').map(Number);
  const periodStart = Date.UTC(year, month - 1, 1);
  const periodEnd = Date.UTC(year, month, 1) - 1;
  const start = new Date(tenancy.startDate).getTime();
  const end = tenancy.endDate ? new Date(tenancy.endDate).getTime() : null;
  return Number.isFinite(start) && start <= periodEnd && (end === null || (Number.isFinite(end) && end >= periodStart));
};
