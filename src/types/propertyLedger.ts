import type { Property, UserReference } from '@/types/property';

export type LedgerStatus = 'pending' | 'paid' | 'skipped';
export type IncomeStatus = 'pending' | 'received';
export type TemplateFrequency = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type LedgerApartmentReference = {
  _id: string;
  apartmentNumber: string;
};

export type ExpenseCategory = {
  _id: string;
  ownerId: string;
  key: string;
  name: string;
  isActive: boolean;
  isSystemDefault: boolean;
};

export type ExpenseTemplate = {
  _id: string;
  ownerId: string;
  propertyId: string | Pick<Property, '_id' | 'name' | 'address'>;
  apartmentId?: string | LedgerApartmentReference | null;
  categoryId: string | ExpenseCategory;
  title: string;
  defaultAmount?: number | null;
  frequency: TemplateFrequency;
  months: number[];
  activeFrom: string;
  activeTo?: string | null;
  dueDay?: number | null;
  note?: string | null;
  isActive: boolean;
};

export type PropertyExpense = {
  _id: string;
  ownerId: string;
  propertyId: string | Pick<Property, '_id' | 'name' | 'address'>;
  apartmentId?: string | LedgerApartmentReference | null;
  categoryId: string | ExpenseCategory;
  templateId?: string | null;
  period: string;
  expenseDate?: string | null;
  title: string;
  amount?: number | null;
  status: LedgerStatus;
  source: 'template' | 'manual';
  note?: string | null;
  paymentMethod?: string | null;
};

export type PropertyIncome = {
  _id: string;
  ownerId: string;
  propertyId: string | Pick<Property, '_id' | 'name' | 'address'>;
  apartmentId?: string | LedgerApartmentReference | null;
  period: string;
  receivedDate?: string | null;
  title: string;
  amount: number;
  status: IncomeStatus;
  note?: string | null;
  paymentMethod?: string | null;
};

export type LedgerRentBill = {
  _id: string;
  receiptNumber: string;
  billingPeriod?: string;
  propertyId?: string | Pick<Property, '_id' | 'name' | 'address'>;
  apartmentSnapshot: { apartmentNumber: string };
  tenantSnapshot: { name: string; email: string; phone?: string | null };
  totalAmount: number;
  status: 'due' | 'paid';
  paidAt?: string | null;
  paymentMethod?: string | null;
};

export type LedgerSummary = {
  rentBilled: number;
  rentCollected: number;
  rentOutstanding: number;
  otherIncomeReceived: number;
  totalCashIncome: number;
  expensePaid: number;
  expensePending: number;
  netCashFlow: number;
};

export type LedgerOverview = {
  property: Pick<Property, '_id' | 'name' | 'address' | 'ownerId'>;
  period: string;
  summary: LedgerSummary;
  rentBills: LedgerRentBill[];
  otherIncome: PropertyIncome[];
  expenses: PropertyExpense[];
};

export type LedgerMonthlyReport = {
  period: string;
  rentBilled: number;
  rentCollected: number;
  otherIncome: number;
  expenses: number;
  netCashFlow: number;
};

export type LedgerReport = {
  ownerId: string;
  selectedProperty?: Pick<Property, '_id' | 'name' | 'address'> | null;
  properties: Array<Pick<Property, '_id' | 'name' | 'address'>>;
  startPeriod: string;
  endPeriod: string;
  summary: {
    rentBilled: number;
    rentCollected: number;
    otherIncome: number;
    expenses: number;
    netCashFlow: number;
  };
  monthly: LedgerMonthlyReport[];
  rentBills: LedgerRentBill[];
  incomes: PropertyIncome[];
  expenses: PropertyExpense[];
};

export type LedgerOwner = UserReference;

