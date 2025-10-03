import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { clientsAPI, invoicesAPI } from '../../utils/api';
import { format } from 'date-fns';

const ClientDetail = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          clientsAPI.getClient(id),
          invoicesAPI.getInvoices({ page: 1, limit: 100, clientId: id })
        ]);
        setClient(cRes.data.client);
        setInvoices(iRes.data.invoices || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const totals = useMemo(() => {
    const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalOutstanding = invoices.reduce((s, i) => s + (i.remainingAmount || 0), 0);
    return { totalAmount, totalPaid, totalOutstanding };
  }, [invoices]);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    </Layout>
  );

  if (!client) return (
    <Layout>
      <div className="p-6">Client not found.</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{client.name}{client.company ? ` — ${client.company}` : ''}</h1>
          <Link to={`/clients/${client._id}/edit`} className="px-3 py-2 border rounded">Edit</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Invoiced</div>
            <div className="text-xl font-semibold">₹ {totals.totalAmount.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="text-xl font-semibold text-green-600">₹ {totals.totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Outstanding</div>
            <div className="text-xl font-semibold text-red-600">₹ {totals.totalOutstanding.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Invoices</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Issued</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Balance</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="border-b last:border-0">
                    <td className="py-2">{inv.invoiceNumber}</td>
                    <td className="py-2">{inv.issueDate ? format(new Date(inv.issueDate), 'dd-MMM-yy') : '-'}</td>
                    <td className="py-2">{inv.dueDate ? format(new Date(inv.dueDate), 'dd-MMM-yy') : '-'}</td>
                    <td className="py-2">₹ {Number(inv.totalAmount || 0).toFixed(2)}</td>
                    <td className="py-2">₹ {Number(inv.paidAmount || 0).toFixed(2)}</td>
                    <td className="py-2">₹ {Number(inv.remainingAmount ?? ((inv.totalAmount||0) - (inv.paidAmount||0))).toFixed(2)}</td>
                    <td className="py-2 capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${inv.status==='paid' ? 'bg-green-100 text-green-700' : inv.status==='overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{inv.status}</span>
                    </td>
                    <td className="py-2">
                      <Link to={`/invoices/${inv._id}`} className="text-blue-600">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClientDetail;
