import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clientsAPI, clientPortalAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import {
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiMail,
  FiPhone,
  FiBriefcase
} from 'react-icons/fi';
import Layout from '../../components/Layout/Layout';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm,
        includeUnapproved: 'false'
      };
      
      const response = await clientsAPI.getClients(params);
      setClients(response.data.clients);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search to avoid rapid requests
  const debouncedSearch = useMemo(() => {
    const timeout = { id: null };
    return (value) => {
      if (timeout.id) clearTimeout(timeout.id);
      timeout.id = setTimeout(() => {
        setCurrentPage(1);
        setSearchTerm(value);
      }, 300);
    };
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsAPI.deleteClient(id);
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleInvite = async (id) => {
    try {
      const res = await clientPortalAPI.invite(id);
      const link = res.data.approvalLink;
      navigator.clipboard?.writeText(link);
      alert('Approval link copied to clipboard:\n' + link);
    } catch (err) {
      console.error('Invite error:', err);
    }
  };

  const handleRemoveCredentials = async (id) => {
    if (!window.confirm('Remove client portal credentials? The client will no longer be able to login.')) return;
    try {
      await clientsAPI.removeCredentials(id);
      fetchClients();
    } catch (err) {
      console.error('Remove credentials error:', err);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client information</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              to="/clients/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="mr-2" />
              Add Client
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              defaultValue={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <Link to={`/clients/${client._id}`} className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200" title="View Client">
                      <FiUsers className="w-6 h-6 text-blue-600" />
                    </Link>
                    <div className="ml-3">
                      <Link to={`/clients/${client._id}`} className="text-lg font-semibold text-gray-900 hover:underline">{client.name}</Link>
                      {client.company && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiBriefcase className="w-3 h-3 mr-1" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 flex items-center">
                      <FiMail className="w-4 h-4 mr-2" />
                      {client.email}
                    </p>
                    {client.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <FiPhone className="w-4 h-4 mr-2" />
                        {client.phone}
                      </p>
                    )}
                  </div>

                  {/* Client Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <Link to={`/clients/${client._id}`} className="text-2xl font-bold text-gray-900 hover:underline">
                        {formatCurrency(client.totalInvoiced || 0)}
                      </Link>
                      <p className="text-xs text-gray-500">Total Invoiced</p>
                    </div>
                    <div className="text-center">
                      <Link to={`/clients/${client._id}`} className="text-2xl font-bold text-green-600 hover:underline">
                        {formatCurrency(client.totalPaid || 0)}
                      </Link>
                      <p className="text-xs text-gray-500">Total Paid</p>
                    </div>
                  </div>

                  {client.totalOutstanding > 0 && (
                    <div className="mt-3 text-center">
                      <Link to={`/clients/${client._id}`} className="text-sm font-medium text-red-600 hover:underline">
                        Outstanding: {formatCurrency(client.totalOutstanding)}
                      </Link>
                    </div>
                  )}

                  {/* Status */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      client.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status}
                    </span>
                    {client.isApproved ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700">Portal Enabled</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-700">Portal Pending</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2">
                  <Link
                    to={`/clients/${client._id}/edit`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Client"
                  >
                    <FiEdit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(client._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Client"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                <Link
                  to={`/invoices/new?clientId=${client._id}`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Create Invoice
                </Link>
                <button
                  onClick={() => handleInvite(client._id)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Invite to Portal
                </button>
                {client.isApproved && (
                  <button
                    onClick={() => handleRemoveCredentials(client._id)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remove Credentials
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {clients.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria' 
                : 'Get started by adding your first client'}
            </p>
            <Link
              to="/clients/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="mr-2" />
              Add Client
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientsPage;