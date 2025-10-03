import { format, parseISO, isValid } from 'date-fns';

// Format currency (defaults to Indian Rupees and locale)
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
};

// Format date
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '';
  
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  }
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatString);
};

// Generate invoice number
export const generateInvoiceNumber = (prefix = 'INV', number) => {
  return `${prefix}-${String(number).padStart(4, '0')}`;
};

// Calculate invoice totals
export const calculateInvoiceTotals = (items, discountAmount = 0) => {
  const safeNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const subtotal = (items || []).reduce((sum, item) => {
    const qty = Math.max(0, safeNum(item?.quantity, 0));
    const rate = Math.max(0, safeNum(item?.rate, 0));
    return sum + qty * rate;
  }, 0);

  const taxAmount = (items || []).reduce((sum, item) => {
    const qty = Math.max(0, safeNum(item?.quantity, 0));
    const rate = Math.max(0, safeNum(item?.rate, 0));
    const taxRate = Math.max(0, safeNum(item?.taxRate, 0));
    const itemTotal = qty * rate;
    const itemTax = (itemTotal * taxRate) / 100;
    return sum + itemTax;
  }, 0);

  const total = subtotal + taxAmount - safeNum(discountAmount, 0);

  return {
    subtotal,
    taxAmount,
    discountAmount: safeNum(discountAmount, 0),
    total
  };
};

// Validate email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get status color
export const getStatusColor = (status) => {
  const colors = {
    draft: 'gray',
    sent: 'blue',
    viewed: 'yellow',
    paid: 'green',
    overdue: 'red',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
};

// Get payment status
export const getPaymentStatus = (invoice) => {
  if (invoice.paidAmount === 0) return 'unpaid';
  if (invoice.paidAmount >= invoice.totalAmount) return 'paid';
  return 'partial';
};

// Calculate days overdue
export const getDaysOverdue = (dueDate, status) => {
  if (status === 'paid') return 0;
  
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Download file
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};