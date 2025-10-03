import React, { useEffect, useMemo, useState } from 'react';
import ClientLayout from '../../components/ClientPortal/ClientLayout';
import { clientPortalAPI } from '../../utils/api';
import { format } from 'date-fns';

const groupBy = (arr, keyFn) => arr.reduce((acc, item) => {
  const key = keyFn(item);
  acc[key] = acc[key] || [];
  acc[key].push(item);
  return acc;
}, {});

const ClientAnalytics = () => {
  const [invoices, setInvoices] = useState([]);
  const [company, setCompany] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientPortalAPI.listInvoices();
        setInvoices(res.data.invoices || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const companies = useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => set.add(inv.userId?.businessInfo?.businessName || inv.userId?.name || 'Business'));
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

  const byCompany = useMemo(() => {
  const grouped = groupBy(filtered, i => i.userId?.businessInfo?.businessName || i.userId?.name || 'Business');
    return Object.entries(grouped).map(([name, list]) => ({
      name,
      total: list.reduce((s, i) => s + (i.totalAmount || 0), 0),
      paid: list.reduce((s, i) => s + (i.paidAmount || 0), 0),
      due: list.reduce((s, i) => s + (i.remainingAmount || 0), 0),
      count: list.length,
    }));
  }, [filtered]);

  const byMonth = useMemo(() => {
    const grouped = groupBy(filtered, i => (i.issueDate ? format(new Date(i.issueDate), 'yyyy-MM') : 'Unknown'));
    return Object.entries(grouped).map(([m, list]) => ({
      month: m,
      total: list.reduce((s, i) => s + (i.totalAmount || 0), 0),
      paid: list.reduce((s, i) => s + (i.paidAmount || 0), 0),
      due: list.reduce((s, i) => s + (i.remainingAmount || 0), 0),
      count: list.length,
    })).sort((a,b) => a.month.localeCompare(b.month));
  }, [filtered]);

  return (
    <ClientLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics</h1>
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
            <div className="text-sm text-gray-500">Total Invoiced</div>
            <div className="text-xl font-semibold">₹ {totals.total.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Paid by You</div>
            <div className="text-xl font-semibold text-green-600">₹ {totals.paid.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Balance Due</div>
            <div className="text-xl font-semibold text-red-600">₹ {totals.due.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-3">By Company</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Company</th>
                    <th className="py-2">Invoices</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {byCompany.map(row => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="py-2">{row.name}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">₹ {row.total.toFixed(2)}</td>
                      <td className="py-2">₹ {row.paid.toFixed(2)}</td>
                      <td className="py-2">₹ {row.due.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-3">By Month</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Month</th>
                    <th className="py-2">Invoices</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.map(row => (
                    <tr key={row.month} className="border-b last:border-0">
                      <td className="py-2">{row.month}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">₹ {row.total.toFixed(2)}</td>
                      <td className="py-2">₹ {row.paid.toFixed(2)}</td>
                      <td className="py-2">₹ {row.due.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientAnalytics;
