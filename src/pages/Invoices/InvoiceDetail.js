import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { invoicesAPI, clientsAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { downloadFile } from '../../utils/helpers';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const printRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await invoicesAPI.getInvoice(id);
      const inv = res.data?.invoice;
      setInvoice(inv);
      if (inv?.clientId) {
        const clientId = inv.clientId._id || inv.clientId;
        const clientRes = await clientsAPI.getClient(clientId);
        setClient(clientRes.data?.client);
      }
    } catch (e) {
      console.error('Fetch invoice error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendInvoice = async () => {
    setSending(true);
    try {
      await invoicesAPI.sendInvoice(id, { method: 'email' });
      await fetchData();
    } catch (e) {
      console.error('Send invoice error:', e);
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const res = await invoicesAPI.downloadInvoicePdf(id);
      downloadFile(res.data, `${invoice?.invoiceNumber || 'invoice'}.pdf`);
    } catch (e) {
      console.error('Download PDF error:', e);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="p-6">Invoice not found.</div>
      </Layout>
    );
  }

  const totals = {
    subtotal: invoice.subtotalAmount || invoice.subtotal || 0,
    taxAmount: invoice.taxAmount || 0,
    discountAmount: invoice.discountAmount || 0,
    total: invoice.totalAmount || 0,
    paid: invoice.paidAmount || 0,
    balance: (invoice.remainingAmount != null) ? invoice.remainingAmount : ((invoice.totalAmount || 0) - (invoice.paidAmount || 0))
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber || ''}</h1>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 border rounded-lg" onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</button>
          <button className="px-3 py-2 border rounded-lg" onClick={downloadPdf}>Download PDF</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" disabled={sending} onClick={sendInvoice}>{sending ? 'Sending...' : 'Send'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6" ref={printRef}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Bill To</h2>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{client?.name}</div>
                  {client?.company && <div>{client.company}</div>}
                  <div>{client?.email}</div>
                  {client?.phone && <div>{client.phone}</div>}
                  {client?.address && <div className="mt-1 whitespace-pre-line">{client.address}</div>}
                </div>
              </div>
              <div className="text-right text-sm text-gray-700">
                {invoice.userId?.businessInfo?.businessName && (
                  <div className="font-semibold">{invoice.userId.businessInfo.businessName}</div>
                )}
                {invoice.userId?.businessInfo?.taxId && (
                  <div>GSTIN / Tax ID: {invoice.userId.businessInfo.taxId}</div>
                )}
                <div><span className="text-gray-500">Issue Date:</span> {formatDate(invoice.issueDate)}</div>
                <div><span className="text-gray-500">Due Date:</span> {formatDate(invoice.dueDate)}</div>
                <div><span className="text-gray-500">Status:</span> <span className="uppercase font-semibold">{invoice.status}</span></div>
                {invoice.paidAt && <div><span className="text-gray-500">Paid:</span> {formatDate(invoice.paidAt)}</div>}
              </div>
            </div>

            <div className="mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2">Description</th>
                    <th className="py-2 w-24 text-right">Qty</th>
                    <th className="py-2 w-32 text-right">Rate</th>
                    <th className="py-2 w-24 text-right">Tax %</th>
                    <th className="py-2 w-32 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((i, idx) => {
                    const lineSubtotal = Number(i.quantity) * Number(i.rate);
                    const lineTax = lineSubtotal * (Number(i.taxRate || 0) / 100);
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">{i.description}</td>
                        <td className="py-2 text-right">{i.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(i.rate)}</td>
                        <td className="py-2 text-right">{i.taxRate || 0}</td>
                        <td className="py-2 text-right">{formatCurrency(lineSubtotal + lineTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invoice.notes && (
              <div className="mt-6">
                <div className="font-medium">Notes</div>
                <div className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid to Date</span>
                <span>-{formatCurrency(totals.paid)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Balance Due</span>
                <span>{formatCurrency(totals.balance)}</span>
              </div>
            </div>
          </div>

          {invoice.status !== 'paid' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
              <RecordPayment id={id} onRecorded={fetchData} />
            </div>
          )}

          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Payment History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-2">Date</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Transaction ID</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.paymentHistory.map((p, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">{formatDate(p.paymentDate)}</td>
                        <td className="py-2">{String(p.paymentMethod || '').replace(/_/g, ' ')}</td>
                        <td className="py-2">{p.transactionId || '-'}</td>
                        <td className="py-2 text-right">{formatCurrency(p.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const RecordPayment = ({ id, onRecorded }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [method, setMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  const save = async () => {
    if (!amount) return;
    setSaving(true);
    try {
  await invoicesAPI.recordPayment(id, { amount: Number(amount), paymentDate: date, paymentMethod: method, transactionId, notes });
      setAmount('');
    setTransactionId('');
    setNotes('');
      await onRecorded();
    } catch (e) {
      console.error('Record payment error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="form-label">Amount</label>
        <input type="number" step="0.01" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="form-label">Date</label>
        <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div>
        <label className="form-label">Method</label>
        <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="check">Cheque</option>
          <option value="upi">UPI</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Card</option>
          <option value="other">Other</option>
        </select>
      </div>
      {(method === 'upi' || method === 'bank_transfer') && (
        <div>
          <label className="form-label">Transaction ID (optional)</label>
          <input className="form-input" placeholder={method==='upi' ? 'UPI Reference/UTR' : 'Bank UTR/Reference'} value={transactionId} onChange={e=>setTransactionId(e.target.value)} />
        </div>
      )}
      <div>
        <label className="form-label">Notes (optional)</label>
        <textarea rows={2} className="form-input" value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>
      <div className="pt-1">
        <button className="px-3 py-2 bg-green-600 text-white rounded" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Record Payment'}</button>
      </div>
    </div>
  );
};

export default InvoiceDetail;