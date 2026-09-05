"use client";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { formatMonth } from "../rent-receipt-M2/page";

const RentReceiptPage = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [formData, setFormData] = useState({
    month: currentMonth,
    date: new Date().toISOString().split("T")[0],
    tenantName: "Abdul Jobbar (01608119094)",
    rent: "14000",
    electricity: "",
    gas: "",
    water: "",
    serviceCharge: "2000",
    garbage: "200",
    adjustment: "",
    note: "",
    noteColor: "blue",
    advance: false,

    // Payment
    isPaid: false,
    paymentDate: "",
  });

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

  const total = useMemo(() => {
    return (
      Number(formData.rent || 0) +
      Number(formData.electricity || 0) +
      Number(formData.gas || 0) +
      Number(formData.water || 0) +
      Number(formData.serviceCharge || 0) +
      Number(formData.garbage || 0) -
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
    setFormData({
      month: currentMonth,
      date: new Date().toISOString().split("T")[0],
      tenantName: "Abdul Jobbar (01608119094)",
      rent: "14000",
      electricity: "",
      gas: "",
      water: "",
      serviceCharge: "2000",
      garbage: "200",
      adjustment: "",
      note: "",
      noteColor: "blue",
      advance: false,
      isPaid: false,
      paymentDate: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 text-black">
      <div className="mx-auto max-w-6xl">
        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">বাড়ি ভাড়া রশিদ</h1>
            <p className="text-sm text-gray-500">স্বপ্ননীড় - Rent Receipt</p>
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

            {/* Month & Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            {/* Tenant */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ভাড়াটিয়ার নাম
              </label>

              <input
                type="text"
                name="tenantName"
                value={formData.tenantName}
                onChange={handleChange}
                placeholder="ভাড়াটিয়ার নাম লিখুন"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Amounts */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                বিলের তথ্য
              </h3>

              <div className="space-y-3">
                <AmountInput
                  label="ভাড়ার পরিমাণ"
                  name="rent"
                  value={formData.rent}
                  onChange={handleChange}
                />

                <AmountInput
                  label="বিদ্যুৎ বিল"
                  name="electricity"
                  value={formData.electricity}
                  onChange={handleChange}
                />

                <AmountInput
                  label="গ্যাস বিল"
                  name="gas"
                  value={formData.gas}
                  onChange={handleChange}
                />

                <AmountInput
                  label="পানি বিল"
                  name="water"
                  value={formData.water}
                  onChange={handleChange}
                />

                <AmountInput
                  label="সার্ভিস চার্জ"
                  name="serviceCharge"
                  value={formData.serviceCharge}
                  onChange={handleChange}
                />

                <AmountInput
                  label="ময়লার বিল"
                  name="garbage"
                  value={formData.garbage}
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

            {/* Advance */}
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                name="advance"
                checked={formData.advance}
                onChange={handleChange}
                className="h-5 w-5 accent-blue-600"
              />

              <div>
                <p className="font-medium text-gray-800">এডভান্স</p>

                <p className="text-xs text-gray-500">
                  এই রশিদটি এডভান্স হিসেবে চিহ্নিত করুন
                </p>
              </div>
            </label>

            {/* Payment Status */}
            <div className="mt-5 rounded-lg border border-gray-200 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={formData.isPaid}
                  onChange={handleChange}
                  className="h-5 w-5 accent-green-600"
                />

                <div>
                  <p className="font-medium text-gray-800">Payment Received</p>

                  <p className="text-xs text-gray-500">
                    পেমেন্ট হয়ে গেলে এখানে টিক দিন
                  </p>
                </div>
              </label>

              {formData.isPaid && (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Payment Date
                  </label>

                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
              className="receipt-paper relative w-full max-w-150 bg-white p-8 shadow-lg"
            >
              {/* Header */}
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-wide text-gray-900">
                  স্বপ্ননীড়
                </h1>

                <p className="mt-2 text-sm text-gray-700">
                  ফ্ল্যাট - ৭/ডি, বিল্ডিং- খ-৯২/০/৫,
                  <br />
                  উত্তর বিশিল, মিরপুর, ঢাকা
                </p>

                <div className="mx-auto mt-5 inline-block border-b-2 border-gray-800 pb-1">
                  <h2 className="text-xl font-bold text-black">
                    বাড়ি ভাড়া রশিদ
                  </h2>
                </div>
              </div>

              {/* Payment Seal */}

              {/* <div className="absolute bottom-36 left-10 mt-5 flex justify-end">
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
              </div> */}

              {/* Basic Information */}
              <div className="mt-7 space-y-3 text-[15px] text-black">
                {/* <div className="flex justify-between">
                  <div className="flex">
                    <span className="mr-4 font-semibold">মাস:</span>

                    <span className="flex-1 border-b border-dotted border-gray-500">
                      {formData.month
                        ? new Date(`${formData.month}-01`).toLocaleDateString(
                            "bn-BD",
                            {
                              year: "numeric",
                              month: "long",
                            },
                          )
                        : ""}
                    </span>
                  </div>

                  <div className="flex">
                    <span className="mr-4 font-semibold">তারিখ:</span>

                    <span className="flex-1 border-b border-dotted border-gray-500">
                      {formData.date
                        ? new Date(
                            `${formData.date}T00:00:00`,
                          ).toLocaleDateString("bn-BD")
                        : ""}
                    </span>
                  </div>
                </div> */}
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

                <div className="flex">
                  <span className="mr-4 font-semibold">ভাড়াটিয়ার নাম:</span>

                  <span className="flex-1 border-b border-dotted border-gray-500">
                    {formData.tenantName}
                  </span>
                </div>
              </div>

              {/* Amount Table */}
              <div className="mt-7 overflow-hidden border border-gray-800 text-black">
                <div className="grid grid-cols-[1fr_150px] border-b border-gray-800 font-semibold">
                  <div className="border-r border-gray-800 p-3">বিবরণ</div>

                  <div className="p-3 text-right">টাকা</div>
                </div>

                <ReceiptRow label="ভাড়ার পরিমাণ" value={formData.rent} />

                <ReceiptRow label="বিদ্যুৎ বিল" value={formData.electricity} />

                <ReceiptRow label="গ্যাস বিল" value={formData.gas} />

                <ReceiptRow label="পানি বিল" value={formData.water} />

                <ReceiptRow
                  label="সার্ভিস চার্জ"
                  value={formData.serviceCharge}
                />

                <ReceiptRow label="ময়লার বিল" value={formData.garbage} />

                {Number(formData.adjustment || 0) > 0 && (
                  <ReceiptRow
                    label="অ্যাডজাস্টমেন্ট (অগ্রিম কর্তন)"
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

              {/* Advance Seal */}
              {/* {formData.advance && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-blue-600 px-3 py-1.5 font-bold text-blue-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-sm text-white">
                    ✓
                  </span>

                  <span>অগ্রিম (ADVANCE)</span>
                </div>
              )} */}

              {/* Signature */}
              {/* <div className="mt-4 flex justify-end">
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
              </div> */}
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
      <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }

                    body {
                        margin: 0;
                        background: white;
                    }

                    body * {
                        visibility: hidden;
                    }

                    #rent-receipt,
                    #rent-receipt * {
                        visibility: visible;
                    }

                    #rent-receipt {
                        position: absolute;
                        left: 50%;
                        top: 20mm;
                        transform: translateX(-50%);
                        width: 180mm !important;
                        max-width: 180mm !important;
                        box-shadow: none !important;
                        padding: 15mm !important;
                    }
                }
            `}</style>
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
