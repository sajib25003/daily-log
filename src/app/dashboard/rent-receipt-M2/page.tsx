"use client";
import Image from "next/image";
import React, { useMemo, useState } from "react";

type TenantData = {
  id: string;
  label: string;
  name: string;
  flatNo: string;
  rentAmount: string;
  waterBill: string;
  garbageBill: string;
  caretakerBill: string;
  staircaseCleaning: string;
};

const tenantData: TenantData[] = [
  {
    id: "1A",
    label: "Shahin - 1A",
    name: "Shahin (01957780735)",
    flatNo: "1-A",
    rentAmount: "13000",
    waterBill: "1000",
    garbageBill: "100",
    caretakerBill: "700",
    staircaseCleaning: "",
  },
  {
    id: "2A",
    label: "Jakir - 2A",
    name: "Jakir (01711111111)",
    flatNo: "2-A",
    rentAmount: "",
    waterBill: "",
    garbageBill: "",
    caretakerBill: "",
    staircaseCleaning: "",
  },
  {
    id: "5A",
    label: "Sajib - 5A (M)",
    name: "Sajib (01833371780)",
    flatNo: "5-A",
    rentAmount: "13000",
    waterBill: "1000",
    garbageBill: "100",
    caretakerBill: "700",
    staircaseCleaning: "300",
  },
  {
    id: "5A-S",
    label: "Imran - 5A (Sub)",
    name: "Imran (01732439742)",
    flatNo: "5-A (S)",
    rentAmount: "10000",
    waterBill: "800",
    garbageBill: "80",
    caretakerBill: "600",
    staircaseCleaning: "200",
  },
  {
    id: "5B",
    label: "Mithu - 5B",
    name: "Mithu (01932956188)",
    flatNo: "5-B",
    rentAmount: "13500",
    waterBill: "1000",
    garbageBill: "100",
    caretakerBill: "700",
    staircaseCleaning: "300",
  },
  {
    id: "6A",
    label: "Sagor — 6A",
    name: "Sagor (01799608019)",
    flatNo: "6-A",
    rentAmount: "13500",
    waterBill: "1000",
    garbageBill: "100",
    caretakerBill: "700",
    staircaseCleaning: "300",
  },
];

export const formatMonth = (month: string) => {
  if (!month) return "";

  return new Date(`${month}-01T00:00:00`).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
  });
};

const RentReceiptPage = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonthDate = new Date();

  lastMonthDate.setDate(1);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

  const lastMonth = `${lastMonthDate.getFullYear()}-${String(
    lastMonthDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  const createInitialFormData = () => {
    const tenant = tenantData[0]!;

    return {
      tenantId: tenant.id,
      name: tenant.name,
      flatNo: tenant.flatNo,
      month: currentMonth,
      date: new Date().toISOString().split("T")[0],
      rentAmount: tenant.rentAmount,
      electricBill: "",
      electricBillMonth: "",
      waterBill: tenant.waterBill,
      garbageBill: tenant.garbageBill,
      caretakerBill: tenant.caretakerBill,
      staircaseCleaning: tenant.staircaseCleaning,
      adjustment: "",
      note: "",
      noteColor: "blue",
      advance: false,
      isPaid: false,
      paymentDate: "",
    };
  };

  const [formData, setFormData] = useState(createInitialFormData);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name } = e.target;
    const value =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenant = tenantData.find((item) => item.id === e.target.value);

    if (!tenant) return;

    setFormData((prev) => ({
      ...prev,
      tenantId: tenant.id,
      name: tenant.name,
      flatNo: tenant.flatNo,
      rentAmount: tenant.rentAmount,
      electricBill: "",
      waterBill: tenant.waterBill,
      garbageBill: tenant.garbageBill,
      caretakerBill: tenant.caretakerBill,
      staircaseCleaning: tenant.staircaseCleaning,
      adjustment: "",
      note: "",
      noteColor: "blue",
      advance: false,
      isPaid: false,
      paymentDate: "",
    }));
  };

  const total = useMemo(() => {
    return (
      Number(formData.rentAmount || 0) +
      Number(formData.electricBill || 0) +
      Number(formData.waterBill || 0) +
      Number(formData.garbageBill || 0) +
      Number(formData.caretakerBill || 0) +
      Number(formData.staircaseCleaning || 0) -
      Number(formData.adjustment || 0)
    );
  }, [formData]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData(createInitialFormData());
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 text-black">
      <div className="mx-auto max-w-6xl">
        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">বাড়ি ভাড়া রশিদ</h1>
            <p className="text-sm text-gray-500">M2 - Rent Receipt</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              🖨️ Print / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ================= FORM ================= */}
          <div className="rounded-xl bg-white p-6 shadow print:hidden">
            <h2 className="mb-5 border-b pb-3 text-lg font-semibold text-gray-800">
              রশিদের তথ্য
            </h2>

            {/* Tenant Selection */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ভাড়াটিয়া নির্বাচন করুন
              </label>

              <select
                name="tenantId"
                value={formData.tenantId}
                onChange={handleTenantChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {tenantData.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.label}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-gray-500">
                নির্বাচন করার পর নিচের তথ্য প্রয়োজন অনুযায়ী পরিবর্তন করতে
                পারবেন।
              </p>
            </div>

            {/* Name & Flat */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  নাম
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="নাম লিখুন"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ফ্ল্যাট নং
                </label>

                <input
                  type="text"
                  name="flatNo"
                  value={formData.flatNo}
                  onChange={handleChange}
                  placeholder="ফ্ল্যাট নম্বর লিখুন"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Month & Date */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  মাস
                </label>

                <input
                  type="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  তারিখ
                </label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Amounts */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                বিলের তথ্য
              </h3>

              <div className="space-y-3">
                <AmountInput
                  label="ভাড়ার পরিমাণ"
                  name="rentAmount"
                  value={formData.rentAmount}
                  onChange={handleChange}
                />

                <AmountInput
                  label="বিদ্যুৎ বিল"
                  name="electricBill"
                  value={formData.electricBill}
                  onChange={handleChange}
                />
                <div className="relative flex items-center gap-3">
                  <label className="mb-1 w-44 block text-sm font-medium text-gray-700">
                    বিদ্যুৎ বিলের মাস
                  </label>

                  <input
                    type="month"
                    name="electricBillMonth"
                    value={formData.electricBillMonth}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <AmountInput
                  label="পানি বিল"
                  name="waterBill"
                  value={formData.waterBill}
                  onChange={handleChange}
                />

                <AmountInput
                  label="ময়লার বিল"
                  name="garbageBill"
                  value={formData.garbageBill}
                  onChange={handleChange}
                />

                <AmountInput
                  label="কেয়ারটেকার বিল"
                  name="caretakerBill"
                  value={formData.caretakerBill}
                  onChange={handleChange}
                />

                <AmountInput
                  label="সিঁড়ি পরিষ্কারের বিল"
                  name="staircaseCleaning"
                  value={formData.staircaseCleaning}
                  onChange={handleChange}
                />

                <AmountInput
                  label="Adjustment"
                  name="adjustment"
                  value={formData.adjustment}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Total */}
            <div className="mt-5 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">মোট</span>

                <span className="text-xl font-bold text-blue-600">
                  ৳ {formatAmount(total)}
                </span>
              </div>
            </div>

            {/* Advance & Payment Status */}
            <div className="mt-5 space-y-3 rounded-lg border border-gray-200 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="advance"
                  checked={formData.advance}
                  onChange={handleChange}
                  className="h-5 w-5 rounded accent-amber-600"
                />

                <span className="text-sm font-medium text-gray-700">
                  অগ্রিম (Advance)
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={formData.isPaid}
                  onChange={handleChange}
                  className="h-5 w-5 rounded accent-emerald-600"
                />

                <span className="text-sm font-medium text-gray-700">
                  পরিশোধিত (Paid)
                </span>
              </label>

              {formData.isPaid && (
                <div className="pt-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    পেমেন্টের তারিখ (ঐচ্ছিক)
                  </label>

                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div className="mt-5 rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700">
                  নোট / নোটিশ (ঐচ্ছিক)
                </label>

                <select
                  name="noteColor"
                  value={formData.noteColor}
                  onChange={handleChange}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                </select>
              </div>

              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={3}
                maxLength={250}
                placeholder="রশিদে দেখানোর জন্য সংক্ষিপ্ত নোট লিখুন"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* ================= RECEIPT ================= */}
          <div className="flex items-start justify-center">
            <div
              id="rent-receipt"
              className="receipt-paper w-full max-w-150 bg-white p-8 shadow-lg"
            >
              {/* Header */}
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-wide text-gray-900">
                  বাড়ি ভাড়া রশিদ
                </h1>

                <p className="mt-2 text-sm text-gray-700">
                  বাড়ী: ১৯, রোড: ১০, ব্লক: এইচ, সেকশন: ২
                  <br />
                  মিরপুর, ঢাকা-১২১৬
                </p>

                {/* <div className="mx-auto mt-5 inline-block border-b-2 border-gray-800 pb-1">
                  <h2 className="text-xl font-bold text-black">
                    বাড়ি ভাড়া রশিদ
                  </h2>
                </div> */}
              </div>

              {/* Basic Information */}
              <div className="mt-7 space-y-3 text-[15px] text-black">
                <div className="space-y-3">
                  <div className="flex w-full justify-between gap-4">
                    {/* Month */}
                    <div className="flex w-full items-end">
                      <span className="mr-4 shrink-0 font-semibold">মাস:</span>

                      <span className="min-h-6 flex-1 border-b border-dotted border-gray-500 px-1">
                        {formatMonth(formData.month)}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="mr-4 font-semibold">তারিখ:</span>

                      <span className="flex-1 border-b border-dotted border-gray-500">
                        {formData.date
                          ? new Date(
                              `${formData.date}T00:00:00`,
                            ).toLocaleDateString("bn-BD", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full justify-between gap-4">
                    {/* Name */}
                    <div className="flex w-full items-end">
                      <span className="mr-4 shrink-0 font-semibold">নাম:</span>

                      <span className="min-h-6 flex-1 border-b border-dotted border-gray-500 px-1">
                        {formData.name}
                      </span>
                    </div>
                    {/* Flat Number */}

                    <div className="flex w-2/5 items-end">
                      <span className="mr-4 shrink-0 font-semibold">
                        ফ্ল্যাট নং:
                      </span>

                      <span className="min-h-6 flex-1 border-b border-dotted border-gray-500 px-1">
                        {formData.flatNo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advance & Payment Seal */}

              {/* Amount Table */}
              <div className="mt-7 overflow-hidden border border-gray-800 text-black">
                <div className="grid grid-cols-[1fr_150px] border-b border-gray-800 font-semibold">
                  <div className="border-r border-gray-800 p-3">বিবরণ</div>

                  <div className="p-3 text-right">টাকা</div>
                </div>

                <ReceiptRow label="ভাড়ার পরিমাণ" value={formData.rentAmount} />

                <ReceiptRow
                  label={
                    formData.electricBillMonth
                      ? `বিদ্যুৎ বিল (${formatMonth(formData.electricBillMonth)})`
                      : "বিদ্যুৎ বিল"
                  }
                  value={formData.electricBill}
                />

                <ReceiptRow label="পানি বিল" value={formData.waterBill} />

                <ReceiptRow label="ময়লার বিল" value={formData.garbageBill} />

                <ReceiptRow
                  label="কেয়ারটেকার বিল"
                  value={formData.caretakerBill}
                />

                <ReceiptRow
                  label="সিঁড়ি পরিষ্কারের বিল"
                  value={formData.staircaseCleaning}
                />

                {Number(formData.adjustment || 0) > 0 && (
                  <ReceiptRow
                    label="অ্যাডজাস্টমেন্ট"
                    value={formData.adjustment}
                    isDeduction
                  />
                )}

                {/* Total */}
                <div className="grid grid-cols-[1fr_150px] bg-gray-50 font-bold">
                  <div className="border-r border-gray-800 p-3">মোট</div>

                  <div className="p-3 text-right">৳ {formatAmount(total)}</div>
                </div>
              </div>

              {formData.note.trim() && (
                <div
                  className={`mt-4 whitespace-pre-wrap rounded-md border px-4 py-3 text-sm leading-6 ${
                    formData.noteColor === "green"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  <span className="font-bold">নোট: </span>
                  {formData.note}
                </div>
              )}

              {/* Signature */}
              <div className="mt-4 flex justify-between items-center">
                <div className="mt-5 flex min-h-20 items-center justify-between gap-4">
                  <div>
                    {formData.advance && (
                      <div className="inline-flex items-center gap-2 rounded-md border-2 border-blue-600 px-3 py-1.5 font-bold text-blue-700">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-sm text-white">
                          ✓
                        </span>
                        <span>অগ্রিম (ADVANCE)</span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`-rotate-3 rounded-lg border-4 px-5 py-2 text-center font-black ${
                      formData.isPaid
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-red-600 bg-red-50 text-red-700"
                    }`}
                  >
                    <div className="text-xl tracking-[0.18em]">
                      {formData.isPaid ? "PAID" : "DUE"}
                    </div>

                    {formData.isPaid && formData.paymentDate && (
                      <div className="mt-1 border-t border-current pt-1 text-xs font-semibold tracking-normal">
                        {new Date(
                          `${formData.paymentDate}T00:00:00`,
                        ).toLocaleDateString("bn-BD")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-44 text-center">
                  <Image
                    src="/signature.png"
                    alt="Signature"
                    width={176}
                    height={44}
                  />
                  <div className="border-t border-gray-800 pt-2 text-sm font-medium text-black">
                    অনুমোদিত ব্যক্তির স্বাক্ষর
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center text-xs text-gray-700">
                ধন্যবাদ
              </div>
              {/* System Generated Notice */}
              <div className="mt-4 border border-red-300 bg-red-50 px-4 py-2 text-center text-xs leading-5 text-red-700">
                <p className="mt-1">
                  Note: This is a System Generated Receipt. No physical
                  signature is required. For your records, please save or print
                  this receipt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>
        {`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            height: 296mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #rent-receipt,
          #rent-receipt * {
            visibility: visible !important;
          }

          #rent-receipt {
            position: fixed !important;
            top: 15mm !important;
            left: 50% !important;
            transform: translateX(-50%) !important;

            box-sizing: border-box !important;
            width: 190mm !important;
            max-width: 190mm !important;

            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;

            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}
      </style>
    </div>
  );
};

const AmountInput = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="flex items-center gap-3">
      <label className="w-32 shrink-0 text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          ৳
        </span>

        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          min="0"
          placeholder="0"
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
};

const ReceiptRow = ({
  label,
  value,
  isDeduction = false,
}: {
  label: string;
  value: string;
  isDeduction?: boolean;
}) => {
  const amount = Number(value || 0);

  return (
    <div className="grid grid-cols-[1fr_150px] border-b border-gray-800">
      <div className="border-r border-gray-800 p-3">{label}</div>

      <div
        className={`p-3 text-right ${isDeduction ? "font-medium text-red-700" : ""}`}
      >
        {isDeduction ? "− " : ""}৳ {amount.toLocaleString("en-IN")}
      </div>
    </div>
  );
};

export default RentReceiptPage;
