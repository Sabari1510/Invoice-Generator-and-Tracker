import React, { useEffect, useMemo, useState } from 'react';
import { clientPortalAPI } from '../../utils/api';
import ClientLayout from '../../components/ClientPortal/ClientLayout';
import { format } from 'date-fns';

const ClientInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [company, setCompany] = useState('');
  const [month, setMonth] = useState(''); // yyyy-MM format
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientPortalAPI.listInvoices();
        setInvoices(res.data.invoices || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const companies = useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => {
      const name = inv.userId?.businessInfo?.businessName || inv.userId?.name || 'Business';
      set.add(name);
    });
    return Array.from(set);
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const companyName = inv.userId?.businessInfo?.businessName || inv.userId?.name || 'Business';
      const passCompany = !company || companyName === company;
      const passMonth = !month || (inv.issueDate && format(new Date(inv.issueDate), 'yyyy-MM') === month);
      return passCompany && passMonth;
    });
  }, [invoices, company, month]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const paid = filtered.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const due = filtered.reduce((s, i) => s + (i.remainingAmount || 0), 0);
    return { total, paid, due };
  }, [filtered]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <ClientLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <div className="flex gap-2">
            <select className="border rounded px-3 py-2" value={company} onChange={e=>setCompany(e.target.value)}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="month" className="border rounded px-3 py-2" value={month} onChange={e=>setMonth(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-xl font-semibold">₹ {totals.total.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="text-xl font-semibold text-green-600">₹ {totals.paid.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Balance Due</div>
            <div className="text-xl font-semibold text-red-600">₹ {totals.due.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Company</th>
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Balance</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv._id} className="border-b last:border-0">
                    <td className="py-2">{inv.userId?.businessInfo?.businessName || inv.userId?.name || 'Company'}</td>
                    <td className="py-2">{inv.invoiceNumber}</td>
                    <td className="py-2">{inv.issueDate ? format(new Date(inv.issueDate), 'dd-MMM-yy') : '-'}</td>
                    <td className="py-2">₹ {Number(inv.totalAmount||0).toFixed(2)}</td>
                    <td className="py-2">₹ {Number(inv.paidAmount||0).toFixed(2)}</td>
                    <td className="py-2">₹ {Number(inv.remainingAmount||0).toFixed(2)}</td>
                    <td className="py-2 capitalize">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientInvoices;
