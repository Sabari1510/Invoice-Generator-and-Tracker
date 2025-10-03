import React, { useEffect, useMemo, useState } from 'react';
import { useClientAuth } from '../../context/ClientAuthContext';
import { clientPortalAPI } from '../../utils/api';
import { format } from 'date-fns';
import ClientLayout from '../../components/ClientPortal/ClientLayout';

const ClientDashboard = () => {
  const { isAuthenticated, loading, client, logout } = useClientAuth();
  const [invoices, setInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(null);
  const [payingFor, setPayingFor] = useState(null); // invoice object
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0,10), method: 'upi', transactionId: '', notes: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientPortalAPI.listInvoices();
        setInvoices(res.data.invoices || []);
      } catch {}
    };
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  const totals = useMemo(() => {
    const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalOutstanding = invoices.reduce((s, i) => s + (i.remainingAmount || 0), 0);
    return { totalAmount, totalPaid, totalOutstanding };
  }, [invoices]);

  const openPayModal = (inv) => {
    setPayingFor(inv);
  setPayForm({ amount: String(inv.remainingAmount || 0), date: new Date().toISOString().slice(0,10), method: 'upi', transactionId: '', notes: '' });
  };

  const submitPayment = async () => {
    if (!payingFor) return;
    const amount = parseFloat(payForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return alert('Enter a valid amount');
    setSubmitting(payingFor._id);
    try {
  await clientPortalAPI.submitPaymentRequest(payingFor._id, { amount, date: payForm.date, method: payForm.method, transactionId: payForm.transactionId, notes: payForm.notes });
      alert('Payment request submitted. The business will review it.');
      // refresh invoices list
      const res = await clientPortalAPI.listInvoices();
      setInvoices(res.data.invoices || []);
      setPayingFor(null);
    } catch (e) {
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!isAuthenticated) return <div className="p-6">Please login from /client/login</div>;

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Welcome, {client?.name}</h1>
          <button className="text-sm text-red-600" onClick={logout}>Logout</button>
        </div>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          <h2 className="text-lg font-semibold mb-3">Your Invoices</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Company</th>
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Issued</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Remaining</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="border-b last:border-0">
                    <td className="py-2">{inv.userId?.businessInfo?.businessName || inv.userId?.name || 'Company'}</td>
                    <td className="py-2">{inv.invoiceNumber}</td>
                    <td className="py-2">{inv.issueDate ? format(new Date(inv.issueDate), 'dd-MMM-yy') : '-'}</td>
                    <td className="py-2">{inv.dueDate ? format(new Date(inv.dueDate), 'dd-MMM-yy') : '-'}</td>
                    <td className="py-2">₹ {inv.totalAmount?.toFixed(2)}</td>
                    <td className="py-2">₹ {inv.paidAmount?.toFixed(2)}</td>
                    <td className="py-2">₹ {inv.remainingAmount?.toFixed(2)}</td>
                    <td className="py-2 capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${inv.status==='paid' ? 'bg-green-100 text-green-700' : inv.status==='overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{inv.status}</span>
                    </td>
                    <td className="py-2">
                      {inv.remainingAmount > 0 ? (
                        <button disabled={submitting===inv._id} className="px-3 py-1 rounded bg-blue-600 text-white text-xs disabled:opacity-50" onClick={() => openPayModal(inv)}>
                          {submitting===inv._id ? 'Submitting...' : 'Submit Payment' }
                        </button>
                      ) : (
                        <span className="text-green-600 text-xs">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        {payingFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Submit Payment - {payingFor.invoiceNumber}</h3>
                <button className="text-gray-500" onClick={() => setPayingFor(null)}>✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="form-label">Amount</label>
                  <input type="number" step="0.01" className="form-input" value={payForm.amount} onChange={e=>setPayForm({...payForm, amount: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={payForm.date} onChange={e=>setPayForm({...payForm, date: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Payment Method</label>
                  <select className="form-input" value={payForm.method} onChange={e=>setPayForm({...payForm, method: e.target.value})}>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Cheque</option>
                    <option value="stripe">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                {(payForm.method === 'upi' || payForm.method === 'bank_transfer') && (
                  <div>
                    <label className="form-label">Transaction ID (optional)</label>
                    <input className="form-input" placeholder={payForm.method==='upi' ? 'UPI Reference/UTR' : 'Bank UTR/Reference'} value={payForm.transactionId} onChange={e=>setPayForm({...payForm, transactionId: e.target.value})} />
                  </div>
                )}
                <div>
                  <label className="form-label">Notes (optional)</label>
                  <textarea rows={3} className="form-input" value={payForm.notes} onChange={e=>setPayForm({...payForm, notes: e.target.value})} />
                </div>
                <div className="pt-2 flex gap-2 justify-end">
                  <button className="px-3 py-2 rounded border" onClick={() => setPayingFor(null)}>Cancel</button>
                  <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={submitting===payingFor._id} onClick={submitPayment}>
                    {submitting===payingFor._id ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
