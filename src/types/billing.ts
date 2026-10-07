import type {
  ElectricityMeterPhase,
  ElectricityProviderReference,
} from '@/types/property';

export type ChargeCalculationMode =
  | 'fixed'
  | 'monthlyVariable'
  | 'submeter'
  | 'includedInRent'
  | 'tenantManaged'
  | 'notApplicable';

export type ChargeCategory = {
  _id: string;
  ownerId: string;
  propertyId: string;
  name: string;
  code: string;
  defaultMode: ChargeCalculationMode;
  isSystemDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ElectricityProvider = ElectricityProviderReference & {
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ElectricityTariffScope = 'national' | 'providerSpecific';

export type ElectricityTariffSlab = {
  fromUnit: number;
  toUnit: number | null;
  rate: number;
};

export type ElectricityMeterCharge = {
  meterPhase: ElectricityMeterPhase;
  loadFrom?: number | null;
  loadTo?: number | null;
  amount: number;
};

export type ElectricityTariff = {
  _id: string;
  name: string;
  consumerCategory: 'LT_A_RESIDENTIAL';
  scope: ElectricityTariffScope;
  providerId?: string | ElectricityProviderReference | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  lifeline: { maximumUnit: number; rate: number };
  slabs: ElectricityTariffSlab[];
  vatPercentage: number;
  meterCharges: ElectricityMeterCharge[];
  isActive: boolean;
  createdAt?: string;
};

export type ElectricityCalculation = {
  tariff: {
    id: string;
    name: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    lifeline: { maximumUnit: number; rate: number };
    slabs: ElectricityTariffSlab[];
    vatPercentage: number;
  };
  consumedUnit: number;
  breakdown: Array<{
    label: string;
    unit: number;
    rate: number;
    amount: number;
  }>;
  energyCharge: number;
  meterCharge: number;
  vatAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
};
