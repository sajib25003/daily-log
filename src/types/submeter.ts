import type { ElectricityCalculation } from '@/types/billing';
export type SubmeterReading = {
  _id: string;
  apartmentId: string;
  billingPeriod: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  consumedUnit: number;
  calculation: ElectricityCalculation;
  createdAt?: string;
};
export type SubmeterContext = {
  meterNumber: string;
  previousReading: number | null;
  previousPeriod: string | null;
  existing: SubmeterReading | null;
  locked: boolean;
};
export type SubmeterPayload = {
  apartmentId: string;
  billingPeriod: string;
  previousReading: number;
  currentReading: number;
  meterCharge: number;
  adjustmentAmount: number;
};
