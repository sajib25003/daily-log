import type { UserReference } from '@/types/property';

export type RentBillStatus = 'due' | 'paid' | 'void';
export type RentBillItemType =
  | 'fixed'
  | 'variable'
  | 'adjustment'
  | 'custom';
export type PaymentMethod = 'cash' | 'bank' | 'mobileBanking' | 'other';

export type RentBillItem = {
  categoryId?: string | null;
  key: string;
  label: string;
  amount: number;
  type: RentBillItemType;
};

export type RentBill = {
  _id: string;
  receiptNumber: string;
  billingPeriod: string;
  ownerId: string | UserReference;
  propertyId: string | { _id: string; name: string; address: string };
  apartmentId: string | { _id: string; apartmentNumber: string };
  tenantId: string | UserReference;
  tenantAssignmentId:
    | string
    | {
        _id: string;
        startDate: string;
        endDate?: string | null;
        status: 'active' | 'ended';
      };
  ownerSnapshot: { name: string; phone?: string | null };
  propertySnapshot: { name: string; address: string };
  apartmentSnapshot: { apartmentNumber: string };
  tenantSnapshot: {
    name: string;
    email: string;
    phone?: string | null;
  };
  items: RentBillItem[];
  subtotal: number;
  adjustmentAmount: number;
  adjustmentNote?: string | null;
  totalAmount: number;
  status: RentBillStatus;
  issuedAt: string;
  dueDate?: string | null;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentNote?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RentBillListData = {
  items: RentBill[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalBills: number;
    dueCount: number;
    outstandingAmount: number;
    paidCount: number;
    paidAmount: number;
    voidCount: number;
  };
};

export type RentBillGenerationItem = {
  categoryId: string | null;
  key: string;
  label: string;
  amount: number | null;
  type: 'fixed' | 'variable';
};

export type RentBillGenerationContext = {
  billingPeriod: string;
  tenantAssignmentId: string;
  owner: { id: string; name: string; phone?: string | null };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  property: { id: string; name: string; address: string };
  apartment: { id: string; apartmentNumber: string };
  dueDate: string;
  items: RentBillGenerationItem[];
};

export type RentBillItemForm = {
  categoryId: string | null;
  key: string;
  label: string;
  amount: string;
  type: RentBillItemType;
};

export type RentBillFormPayload = {
  items: RentBillItemForm[];
  adjustmentAmount: string;
  adjustmentNote: string;
  dueDate: string;
  note: string;
};
