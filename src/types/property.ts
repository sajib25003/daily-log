export type UserRole =
  | 'superAdmin'
  | 'admin'
  | 'owner'
  | 'tenant'
  | 'user';

export type UserName = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
};

export type UserReference = {
  _id?: string;
  id?: string;
  name?: UserName;
  email?: string;
  phone?: string;
  role?: UserRole;
  userStatus?: 'active' | 'inactive';
  ownerId?: string | UserReference | null;
};

export type ElectricityProviderReference = {
  _id: string;
  name: string;
  code: string;
  isActive?: boolean;
};

export type ElectricityMeterPhase = 'singlePhase' | 'threePhase';

export type PropertyElectricitySettings = {
  providerId: string | ElectricityProviderReference;
  consumerCategory: 'LT_A_RESIDENTIAL';
  accountNumber?: string | null;
  defaultMeterPhase: ElectricityMeterPhase;
  tariffSelection: 'automatic';
  updatedAt?: string;
};

export type ApartmentElectricityBillingType =
  | 'postpaid'
  | 'prepaid'
  | 'submeter'
  | 'includedInRent'
  | 'notApplicable';

export type ElectricityPaymentResponsibility =
  | 'ownerCollects'
  | 'tenantPaysDirectly'
  | 'notApplicable';

export type ApartmentElectricityConfig = {
  billingType: ApartmentElectricityBillingType;
  paymentResponsibility: ElectricityPaymentResponsibility;
  meterNumber?: string | null;
  note?: string | null;
  updatedAt?: string;
};

export type Property = {
  _id: string;
  name: string;
  address: string;
  note?: string | null;
  ownerId: string | UserReference;
  createdBy?: string | UserReference;
  apartmentCount?: number;
  electricitySettings?: PropertyElectricitySettings | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Apartment = {
  _id: string;
  propertyId: string | Pick<Property, '_id' | 'name' | 'address' | 'ownerId'>;
  apartmentNumber: string;
  note?: string | null;
  createdBy?: string | UserReference;
  createdAt?: string;
  updatedAt?: string;
  currentTenancy?: Tenancy | null;
  electricityConfig?: ApartmentElectricityConfig | null;
};

export type NoticePeriodUnit = 'days' | 'months';

export type RentTerms = {
  baseRent: number;
  dueDay: number;
  effectiveFrom: string;
  noticePeriod: {
    value: number;
    unit: NoticePeriodUnit;
  };
  rentRevision: {
    intervalMonths?: number | null;
    nextRevisionDate?: string | null;
    note?: string | null;
  };
  securityDeposit?: number | null;
  advanceAmount?: number | null;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  note?: string | null;
};

export type RentRateHistory = {
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changedBy?: string | UserReference;
  note?: string | null;
};

export type RentTermsFormData = {
  baseRent: string;
  dueDay: string;
  effectiveFrom: string;
  noticeValue: string;
  noticeUnit: NoticePeriodUnit;
  revisionIntervalMonths: string;
  nextRevisionDate: string;
  revisionNote: string;
  securityDeposit: string;
  advanceAmount: string;
  agreementStartDate: string;
  agreementEndDate: string;
  note: string;
  rateChangeNote: string;
};

export type TenancyStatus = 'active' | 'ended';

export type Tenancy = {
  _id: string;
  apartmentId:
    | string
    | Pick<
        Apartment,
        | '_id'
        | 'apartmentNumber'
        | 'propertyId'
        | 'note'
        | 'electricityConfig'
      >;
  propertyId:
    | string
    | Pick<
        Property,
        '_id' | 'name' | 'address' | 'ownerId' | 'electricitySettings'
      >;
  tenantId: string | UserReference;
  ownerId: string | UserReference;
  startDate: string;
  endDate?: string | null;
  status: TenancyStatus;
  note?: string | null;
  moveOutNote?: string | null;
  createdBy?: string | UserReference;
  endedBy?: string | UserReference | null;
  createdAt?: string;
  updatedAt?: string;
  rentTerms?: RentTerms | null;
  rentRateHistory?: RentRateHistory[];
};

export type TenancyListData = {
  items: Tenancy[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TenancyFormData = {
  tenantId: string;
  startDate: string;
  note: string;
};

export type MoveOutFormData = {
  endDate: string;
  moveOutNote: string;
};

export type PropertyFormData = {
  name: string;
  address: string;
  note: string;
  ownerId: string;
};

export type ApartmentFormData = {
  apartmentNumber: string;
  note: string;
};

export type ApartmentListData = {
  property: {
    _id: string;
    name: string;
    address: string;
    ownerId: string;
  };
  apartments: Apartment[];
};

export const getDocumentId = (
  value?: string | { _id?: string; id?: string } | null,
) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id ?? value.id ?? '';
};

export const formatUserName = (name?: UserName) => {
  if (!name) return 'Unknown user';

  return [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
};
