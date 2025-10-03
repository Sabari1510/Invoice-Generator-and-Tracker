import React, { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fetchRequests = async (status) => {
  const res = await clientPortalAPI.listPaymentRequests({ status });
  return res.data.requests || [];
};

const PaymentRequestsPage = () => {
  const [status, setStatus] = useState('pending');
  const qc = useQueryClient();

  const { data: requests = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payment-requests', status],
    queryFn: () => fetchRequests(status),
    staleTime: 5000,
    refetchInterval: status === 'pending' ? 10000 : false,
  });

  const approve = async (id) => {
    try {
      await clientPortalAPI.approvePaymentRequest(id);
      toast.success('Request approved');
      qc.invalidateQueries(['payment-requests']);
    } catch {}
  };

  const reject = async (id) => {
    try {
      await clientPortalAPI.rejectPaymentRequest(id);
      toast.success('Request rejected');
      qc.invalidateQueries(['payment-requests']);
    } catch {}
  };

  return (
    <Layout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Payment Requests</h1>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="px-3 py-2 text-sm border rounded" onClick={() => refetch()} disabled={isFetching}>Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          {(isLoading || isFetching) ? (
            <div>Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-gray-500">No {status} requests</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Client</th>
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Amount (INR)</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Txn ID</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id} className="border-b last:border-0">
                    <td className="py-2">{r.clientId?.name || '-'}</td>
                    <td className="py-2">{r.invoiceId?.invoiceNumber || '-'}</td>
                    <td className="py-2">₹ {Number(r.amount || 0).toFixed(2)}</td>
                    <td className="py-2">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {String(r.method || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2">{r.transactionId || '-'}</td>
                    <td className="py-2 max-w-xs truncate" title={r.notes || ''}>{r.notes || '-'}</td>
                    <td className="py-2">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => approve(r._id)} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                          <button onClick={() => reject(r._id)} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs ${r.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PaymentRequestsPage;
