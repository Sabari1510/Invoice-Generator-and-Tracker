import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  FiFileText,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiPlus,
  FiEye,
  FiEdit,
  FiSend
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Layout from '../../components/Layout/Layout';

const Dashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getOverview();
      setOverview(response.data.overview);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      name: 'Total Revenue',
      value: formatCurrency(overview?.summary?.totalRevenue || 0),
      change: '+12%',
      changeType: 'increase',
      icon: FiDollarSign,
      color: 'bg-green-500'
    },
    {
      name: 'Outstanding',
      value: formatCurrency(overview?.summary?.outstandingRevenue || 0),
      change: '-5%',
      changeType: 'decrease',
      icon: FiClock,
      color: 'bg-yellow-500'
    },
    {
      name: 'Total Invoices',
      value: overview?.summary?.totalInvoices || 0,
      change: '+8%',
      changeType: 'increase',
      icon: FiFileText,
      color: 'bg-blue-500'
    },
    {
      name: 'Total Clients',
      value: overview?.summary?.totalClients || 0,
      change: '+3%',
      changeType: 'increase',
      icon: FiUsers,
      color: 'bg-purple-500'
    }
  ];

  const statusColors = {
    draft: '#6B7280',
    sent: '#3B82F6',
    paid: '#10B981',
    overdue: '#EF4444'
  };

  const pieData = [
    { name: 'Draft', value: overview?.summary?.draftInvoices || 0, color: statusColors.draft },
    { name: 'Sent', value: overview?.summary?.totalInvoices - overview?.summary?.draftInvoices - overview?.summary?.paidInvoices - overview?.summary?.overdueInvoices || 0, color: statusColors.sent },
    { name: 'Paid', value: overview?.summary?.paidInvoices || 0, color: statusColors.paid },
    { name: 'Overdue', value: overview?.summary?.overdueInvoices || 0, color: statusColors.overdue }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your {user?.userType === 'freelancer' ? 'freelance' : 'business'} invoices
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              to="/invoices/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="mr-2" />
              New Invoice
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                  <Bar dataKey="paid" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Status Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Invoices and Upcoming Due */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
              <Link to="/invoices" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {overview?.recentInvoices?.slice(0, 5).map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!overview?.recentInvoices || overview.recentInvoices.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No invoices yet</p>
                  <Link 
                    to="/invoices/new"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                  >
                    Create your first invoice
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Due */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Due</h2>
              <span className="text-sm text-gray-600">Next 7 days</span>
            </div>
            <div className="space-y-3">
              {overview?.upcomingDue?.slice(0, 5).map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">Due {formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(invoice.remainingAmount)}</p>
                    <div className="flex space-x-1 mt-1">
                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="View"
                      >
                        <FiEye size={14} />
                      </Link>
                      <Link
                        to={`/invoices/${invoice._id}/edit`}
                        className="p-1 text-gray-600 hover:text-green-600"
                        title="Edit"
                      >
                        <FiEdit size={14} />
                      </Link>
                      <button
                        className="p-1 text-gray-600 hover:text-orange-600"
                        title="Send Reminder"
                      >
                        <FiSend size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!overview?.upcomingDue || overview.upcomingDue.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No upcoming due dates</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/invoices/new"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FiPlus className="h-6 w-6 text-blue-600 mr-3" />
              <span className="font-medium text-blue-900">New Invoice</span>
            </Link>
            <Link
              to="/clients/new"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <FiUsers className="h-6 w-6 text-green-600 mr-3" />
              <span className="font-medium text-green-900">Add Client</span>
            </Link>
            <Link
              to="/analytics"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <FiTrendingUp className="h-6 w-6 text-purple-600 mr-3" />
              <span className="font-medium text-purple-900">Analytics</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiUsers className="h-6 w-6 text-gray-600 mr-3" />
              <span className="font-medium text-gray-900">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;