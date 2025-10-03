import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { invoicesAPI, clientsAPI } from '../../utils/api';
import { formatCurrency, formatDate, downloadFile } from '../../utils/helpers';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit,
  FiEye,
  FiTrash2,
  FiSend,
  FiDownload,
  FiMoreVertical,
  FiFileText
} from 'react-icons/fi';
import Layout from '../../components/Layout/Layout';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: statusFilter
      };
      
      const response = await invoicesAPI.getInvoices(params);
      setInvoices(response.data.invoices);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Load clients for bulk download selector
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await clientsAPI.getClients({ page: 1, limit: 200 });
        setClients(res.data.clients || []);
      } catch (e) {
        console.error('Failed to load clients', e);
      }
    };
    loadClients();
  }, []);

  const fetchAllInvoices = async () => {
    // Pull all pages to ensure we have complete dataset
    const limit = 100;
    let page = 1;
    let all = [];
    try {
      // Keep any status filter if applied; ignore search to avoid missing invoices
      // If backend supports clientId filter, pass it to reduce payload
      // We'll still filter client-side as a fallback
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params = { page, limit };
        if (statusFilter) params.status = statusFilter;
        if (selectedClientId) params.clientId = selectedClientId;
        const res = await invoicesAPI.getInvoices(params);
        const pageItems = res.data?.invoices || [];
        const tp = res.data?.totalPages || 1;
        all = all.concat(pageItems);
        if (page >= tp || pageItems.length === 0) break;
        page += 1;
      }
    } catch (e) {
      console.error('Error fetching all invoices', e);
      throw e;
    }
    return all;
  };

  const handleBulkDownload = async () => {
    if (!selectedClientId) {
      toast.error('Please select a client first');
      return;
    }
    const client = clients.find(c => c._id === selectedClientId);
    const clientName = client?.name || 'Client';
    let all = [];
    try {
      const loadingId = toast.loading('Preparing downloads...');
      all = await fetchAllInvoices();
      // Filter by client id (handle both populated object and id)
      const toDownload = all.filter(inv => {
        const cid = typeof inv.clientId === 'object' ? inv.clientId?._id : inv.clientId;
        return cid === selectedClientId;
      });
      toast.dismiss(loadingId);
      if (toDownload.length === 0) {
        toast('No invoices found for the selected client');
        return;
      }
      if (toDownload.length > 20) {
        const confirmMany = window.confirm(`This will download ${toDownload.length} PDF files for ${clientName}. Continue?`);
        if (!confirmMany) return;
      }
      // Sequentially download each invoice PDF to avoid overwhelming the browser
      for (let i = 0; i < toDownload.length; i++) {
        const inv = toDownload[i];
        try {
          const res = await invoicesAPI.downloadInvoicePdf(inv._id);
          const filename = `${inv.invoiceNumber || 'invoice'}-${clientName.replace(/[^a-z0-9_-]/gi,'_')}.pdf`;
          downloadFile(res.data, filename);
          // Optional small delay to let browser process
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          console.error('Failed to download invoice', inv._id, e);
        }
      }
      toast.success(`Downloaded ${toDownload.length} invoices for ${clientName}`);
    } catch (e) {
      toast.error('Failed to prepare downloads');
    }
  };

  const handleDownloadStatusReport = async () => {
    if (!statusFilter) {
      toast.error('Select a status to download the report');
      return;
    }
    try {
      const loadingId = toast.loading('Generating PDF...');
      const all = await fetchAllInvoices();
      // Filter by selected status and optional selected client
      const filtered = all.filter(inv => {
        const matchStatus = inv.status === statusFilter;
        if (!matchStatus) return false;
        if (!selectedClientId) return true;
        const cid = typeof inv.clientId === 'object' ? inv.clientId?._id : inv.clientId;
        return cid === selectedClientId;
      });
      toast.dismiss(loadingId);
      if (filtered.length === 0) {
        toast('No invoices match the selected filters');
        return;
      }

  // Build PDF
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const margin = 12;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  // jsPDF default font doesn't support the ₹ glyph; use ASCII-safe currency formatting
  const asCurrency = (n) => `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
      const header = () => {
        doc.setFontSize(16);
        doc.text('Invoices Report', margin, margin);
        doc.setFontSize(10);
        const statusText = `Status: ${statusFilter}`;
        const dateText = new Date().toLocaleString('en-IN');
        doc.text(statusText, margin, margin + 6);
        doc.text(dateText, pageWidth - margin, margin + 6, { align: 'right' });
        // Table header
        let y = margin + 14;
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(30, 64, 175); // blue-800
        doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
        doc.text('Invoice', margin + 2, y);
        doc.text('Client', margin + 40, y);
        doc.text('Amount', margin + 110, y, { align: 'right' });
        doc.text('Paid', margin + 140, y, { align: 'right' });
        doc.text('Due', margin + 170, y, { align: 'right' });
        doc.text('Issue', margin + 190, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        return y + 6;
      };

      const truncate = (str, n = 28) => (str && str.length > n ? str.slice(0, n - 1) + '…' : str || '');

      // Summary
      const sums = filtered.reduce((acc, inv) => {
        acc.amount += Number(inv.totalAmount || 0);
        acc.paid += Number(inv.paidAmount || 0);
        return acc;
      }, { amount: 0, paid: 0 });
      const balanceTotal = Math.max(0, sums.amount - sums.paid);

      let y = header();
      doc.setFontSize(9);

      const drawRow = (inv) => {
        const invNo = inv.invoiceNumber || inv._id?.slice(-6) || '';
        const clientName = truncate(inv.clientId?.name || 'Unknown');
        const amt = asCurrency(inv.totalAmount);
        const paid = asCurrency(inv.paidAmount);
        const due = asCurrency(Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)));
        const issue = formatDate(inv.issueDate || inv.createdAt, 'dd/MM/yy');
        doc.text(invNo, margin + 2, y);
        doc.text(clientName, margin + 40, y);
        doc.text(amt, margin + 110, y, { align: 'right' });
        doc.text(paid, margin + 140, y, { align: 'right' });
        doc.text(due, margin + 170, y, { align: 'right' });
        doc.text(issue, margin + 190, y, { align: 'right' });
      };

      for (let i = 0; i < filtered.length; i++) {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = header();
        }
        drawRow(filtered[i]);
        y += 6;
      }

      // Footer summary box
      if (y > pageHeight - 30) {
        doc.addPage();
        y = header();
      }
      doc.setDrawColor(203, 213, 225); // gray-300
      doc.rect(margin, y + 2, pageWidth - margin * 2, 18);
      doc.setFontSize(10);
      doc.text(`Count: ${filtered.length}`, margin + 4, y + 10);
  doc.text(`Total: ${asCurrency(sums.amount)}`, margin + 50, y + 10);
  doc.text(`Paid: ${asCurrency(sums.paid)}`, margin + 110, y + 10);
  doc.text(`Balance: ${asCurrency(balanceTotal)}`, margin + 160, y + 10);

      const fileStatus = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
      const fileName = `Invoices-${fileStatus}-${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      toast.success('Report downloaded');
    } catch (e) {
      console.error('Failed to generate report', e);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.deleteInvoice(id);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        const msg = error?.response?.data?.message || 'Failed to delete invoice';
        toast.error(msg);
      }
    }
  };

  const handleSendInvoice = async (id) => {
    try {
      await invoicesAPI.sendInvoice(id, { method: 'email' });
      fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">Manage and track your invoices</p>
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

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleDownloadStatusReport}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!statusFilter}
              title="Download a single PDF report for selected status"
            >
              <FiDownload className="mr-2" /> Download (single PDF)
            </button>
            {/* Bulk download by client */}
            <div className="flex-1 sm:flex-none sm:w-80 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkDownload}
                className="inline-flex items-center justify-center px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedClientId}
                title="Download all invoices for selected client"
              >
                <FiDownload className="mr-2" /> Download all
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(invoice.issueDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.clientId?.name || 'Unknown Client'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.clientId?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                      {invoice.paidAmount > 0 && (
                        <div className="text-sm text-green-600">
                          Paid: {formatCurrency(invoice.paidAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/invoices/${invoice._id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <FiEye size={16} />
                        </Link>
                        <Link
                          to={`/invoices/${invoice._id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <FiEdit size={16} />
                        </Link>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleSendInvoice(invoice._id)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Send"
                          >
                            <FiSend size={16} />
                          </button>
                        )}
                        {invoice.status !== 'paid' ? (
                          <button
                            onClick={() => handleDelete(invoice._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        ) : (
                          <span className="text-gray-300" title="Paid invoices cannot be deleted">
                            <FiTrash2 size={16} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter 
                  ? 'Try adjusting your search criteria' 
                  : 'Get started by creating your first invoice'}
              </p>
              <Link
                to="/invoices/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="mr-2" />
                Create Invoice
              </Link>
            </div>
          )}
        </div>

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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

export default InvoicesPage;