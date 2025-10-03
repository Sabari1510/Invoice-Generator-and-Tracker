import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout/Layout';

const ClientProfileRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profile-requests');
      setRequests(res.data.requests || []);
    } catch (e) {
      console.error('Load profile requests failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await api.post(`/profile-requests/${id}/approve`);
      await load();
    } catch (e) {
      console.error('Approve failed', e);
    }
  };
  const reject = async (id) => {
    try {
      await api.post(`/profile-requests/${id}/reject`);
      await load();
    } catch (e) {
      console.error('Reject failed', e);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Client Profile Requests</h1>
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-gray-600">No pending requests</div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">Name</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">Company</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">Email</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">Phone</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r._id} className="border-t">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">{r.company || '-'}</td>
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2">{r.phone || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => approve(r._id)} className="px-3 py-1 bg-emerald-600 text-white rounded">Approve</button>
                      <button onClick={() => reject(r._id)} className="ml-2 px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientProfileRequestsPage;
