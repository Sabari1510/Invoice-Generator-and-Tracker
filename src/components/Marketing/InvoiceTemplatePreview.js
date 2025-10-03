import React, { useState } from 'react';

const templates = [
  { id: 'standard', name: 'Standard', accent: 'bg-blue-600', border: 'border-gray-200' },
  { id: 'minimal', name: 'Minimal', accent: 'bg-gray-900', border: 'border-gray-300' },
  { id: 'classic', name: 'Classic', accent: 'bg-indigo-700', border: 'border-gray-300' },
];

const sample = {
  business: { name: 'BharatBill Pvt Ltd', gstin: '22ABCDE1234F1Z5' },
  invoice: { number: 'INV-2025-001', date: '28 Sep 2025', due: '05 Oct 2025' },
  billTo: { name: 'Acme Corp', email: 'ap@acme.com' },
  items: [
    { desc: 'Website redesign', qty: 1, rate: 80000 },
    { desc: 'SEO setup', qty: 1, rate: 25000 },
    { desc: 'Hosting (annual)', qty: 1, rate: 13000 },
  ],
  taxPct: 18,
  paid: 50000,
};

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function computeTotals() {
  const subtotal = sample.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = Math.round((subtotal * sample.taxPct) / 100);
  const total = subtotal + tax;
  const balance = total - sample.paid;
  return { subtotal, tax, total, balance };
}

const InvoiceCard = ({ variant }) => {
  const { subtotal, tax, total, balance } = computeTotals();
  const accent = templates.find(t => t.id === variant)?.accent || templates[0].accent;
  const border = templates.find(t => t.id === variant)?.border || templates[0].border;

  return (
    <div className={`w-full h-64 md:h-72 border ${border} rounded-lg overflow-hidden bg-white flex flex-col`}>
      {/* Header */}
      <div className={`h-2 ${accent}`} />
      <div className="p-4 flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">{sample.business.name}</div>
          <div className="text-xs text-gray-500">GSTIN: {sample.business.gstin}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">Invoice</div>
          <div className="text-xs text-gray-500">#{sample.invoice.number}</div>
          <div className="text-xs text-gray-500">Date: {sample.invoice.date}</div>
        </div>
      </div>

      {/* Bill To */}
      <div className="px-4 text-xs text-gray-600">Bill To</div>
      <div className="px-4 pb-2 text-sm text-gray-800">{sample.billTo.name} <span className="text-gray-500 text-xs">({sample.billTo.email})</span></div>

      {/* Items */}
      <div className="px-4">
        <div className="grid grid-cols-6 text-xs text-gray-500 border-b border-gray-200 pb-1">
          <div className="col-span-4">Description</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Amount</div>
        </div>
        <div className="max-h-20 overflow-hidden divide-y">
          {sample.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-6 py-1 text-sm">
              <div className="col-span-4 truncate">{it.desc}</div>
              <div className="text-right text-gray-600">{it.qty}</div>
              <div className="text-right">{formatINR(it.qty * it.rate)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-auto px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 text-sm">
          <div className="text-gray-600">Subtotal</div>
          <div className="text-right font-medium">{formatINR(subtotal)}</div>
        </div>
        <div className="grid grid-cols-2 text-sm">
          <div className="text-gray-600">GST {sample.taxPct}%</div>
          <div className="text-right font-medium">{formatINR(tax)}</div>
        </div>
        <div className="grid grid-cols-2 text-sm">
          <div className="text-gray-900 font-semibold">Total</div>
          <div className="text-right font-semibold">{formatINR(total)}</div>
        </div>
        <div className="grid grid-cols-2 text-xs mt-1">
          <div className="text-gray-600">Paid</div>
          <div className="text-right text-gray-700">{formatINR(sample.paid)}</div>
        </div>
        <div className="grid grid-cols-2 text-xs">
          <div className="text-gray-600">Balance Due</div>
          <div className="text-right font-bold text-red-600">{formatINR(balance)}</div>
        </div>
      </div>
    </div>
  );
};

const InvoiceTemplatePreview = ({ initialTemplate = 'standard' }) => {
  const [variant, setVariant] = useState(initialTemplate);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Invoice preview</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Template:</span>
          <div className="inline-flex rounded border border-gray-200 overflow-hidden">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setVariant(t.id)}
                className={`px-2.5 py-1 text-xs ${variant === t.id ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
                aria-pressed={variant === t.id}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <InvoiceCard variant={variant} />
      </div>
    </div>
  );
};

export default InvoiceTemplatePreview;
