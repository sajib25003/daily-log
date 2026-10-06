export type UserRole = "superAdmin" | "admin" | "owner" | "tenant" | "user";

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
  userStatus?: "active" | "inactive";
};

export type Property = {
  _id: string;
  name: string;
  address: string;
  note?: string | null;
  ownerId: string | UserReference;
  createdBy?: string | UserReference;
  apartmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Apartment = {
  _id: string;
  propertyId: string | Pick<Property, "_id" | "name" | "address" | "ownerId">;
  apartmentNumber: string;
  note?: string | null;
  createdBy?: string | UserReference;
  createdAt?: string;
  updatedAt?: string;
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
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id ?? value.id ?? "";
};

export const formatUserName = (name?: UserName) => {
  if (!name) return "Unknown owner";

  return [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
};
