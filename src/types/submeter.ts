import type { ElectricityCalculation } from '@/types/billing';
export type SubmeterReading = {
  _id: string;
  apartmentId: string;
  billingPeriod: string;
  meterNumber: string;
  previousReadingDate: string;
  currentReadingDate: string;
  revision?: number;
  previousReading: number;
  currentReading: number;
  consumedUnit: number;
  calculation: ElectricityCalculation;
  createdAt?: string;
  syncedRentBills?: number;
  syncWarning?: string;
  status?: 'due' | 'paid' | 'notBilled';
};
export type SubmeterContext = {
  meterNumber: string;
  previousReading: number | null;
  previousPeriod: string | null;
  previousReadingDate: string | null;
  previousMeterCharge: number | null;
  existing: SubmeterReading | null;
  locked: boolean;
};
export type SubmeterPayload = {
  previousReadingDate: string;
  currentReadingDate: string;
  expectedRevision?: number | null;
  apartmentId: string;
  billingPeriod: string;
  previousReading: number;
  currentReading: number;
  meterCharge: number;
  adjustmentAmount: number;
};
