import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { dashboardAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const ov = await dashboardAPI.getOverview();
        const overview = ov.data?.overview || {};
        const monthlyRevenue = Array.isArray(overview.monthlyRevenue) ? overview.monthlyRevenue : [];
        const topClients = Array.isArray(overview.topClients) ? overview.topClients : [];

        setMonthly(monthlyRevenue.map(m => ({ month: m.month, total: m.revenue })));
        setClients(topClients.map(c => ({ name: c.client || 'Client', total: c.revenue })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Top Clients</h2>
            <ul className="space-y-2">
              {clients.map((c, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;