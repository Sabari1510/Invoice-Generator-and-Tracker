const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const puppeteer = require('puppeteer');

const router = express.Router();

// Get all invoices for a user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      clientId = '', 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (clientId) {
      query.clientId = clientId;
    }
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name email company')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('clientId')
      .populate('userId', 'businessInfo name email');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new invoice
router.post('/', auth, [
  body('clientId').isMongoId().withMessage('Valid client ID is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('dueDate').custom((dueDate, { req }) => {
    const issue = req.body.issueDate ? new Date(req.body.issueDate) : null;
    const due = new Date(dueDate);
    if (issue && due < issue) {
      throw new Error('Due date must be the same or after issue date');
    }
    return true;
  }),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().isLength({ min: 1 }).withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Item quantity must be greater than 0'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('Item rate must be 0 or greater')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify client belongs to user
    const client = await Client.findOne({ _id: req.body.clientId, userId: req.user.id });
    if (!client) {
      return res.status(400).json({ message: 'Client not found' });
    }

    // Calculate amounts
    let subtotal = 0;
    let totalTaxAmount = 0;

    const items = req.body.items.map(item => {
      const amount = item.quantity * item.rate;
      const taxAmount = (amount * (item.taxRate || 0)) / 100;
      
      subtotal += amount;
      totalTaxAmount += taxAmount;

      return {
        ...item,
        amount,
        taxAmount
      };
    });

    // Note: stock validation/decrement removed per configuration — invoices won't alter product stock

    const discountAmount = req.body.discountAmount || 0;
    const totalAmount = subtotal + totalTaxAmount - discountAmount;

    // Prefer user's invoice prefix from settings if available
    const user = req.user; // set by auth middleware
    let userPrefix = null;
    try {
      // Lazy require to avoid circulars
      const User = require('../models/User');
      const u = await User.findById(req.user.id).select('settings');
      userPrefix = u?.settings?.invoicePrefix || null;
    } catch {}
    const prefix = userPrefix || process.env.INVOICE_PREFIX || 'INV';
    const currentCount = await Invoice.countDocuments({ userId: req.user.id });
    const invoiceNumber = `${prefix}-${String(currentCount + 1).padStart(4, '0')}`;

    const invoice = new Invoice({
      userId: req.user.id,
      clientId: req.body.clientId,
      issueDate: req.body.issueDate || new Date(),
      dueDate: req.body.dueDate,
      paymentTerms: req.body.paymentTerms || 'Net 30',
      items,
      subtotal,
      taxAmount: totalTaxAmount,
      discountAmount,
      totalAmount,
      currency: req.body.currency || 'INR',
      notes: req.body.notes,
      internalNotes: req.body.internalNotes,
      template: req.body.template || 'standard',
      remainingAmount: totalAmount,
      invoiceNumber
    });

    // Save invoice with retry on duplicate invoiceNumber (race condition when counting)
    try {
      await invoice.save();
    } catch (err) {
      if (err && err.code === 11000 && String(err.message).includes('invoiceNumber')) {
        try {
          // fallback to timestamp-based invoice number to avoid collisions
          invoice.invoiceNumber = `${prefix}-${Date.now()}`;
          await invoice.save();
        } catch (err2) {
          console.error('Create invoice error (retry failed):', err2);
          return res.status(500).json({ message: 'Server error creating invoice' });
        }
      } else {
        throw err;
      }
    }
    
    // Update client totals
    client.totalInvoiced += totalAmount;
    client.totalOutstanding += totalAmount;
    await client.save();

    const populatedInvoice = await Invoice.findById(invoice._id).populate('clientId');
    res.status(201).json({ message: 'Invoice created successfully', invoice: populatedInvoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an invoice
router.put('/:id', auth, async (req, res) => {
  try {
    // If updating dates, ensure they are valid and dueDate is not before issueDate
    if (req.body.issueDate || req.body.dueDate) {
      if (req.body.issueDate && isNaN(new Date(req.body.issueDate))) return res.status(400).json({ message: 'Invalid issue date' });
      if (req.body.dueDate && isNaN(new Date(req.body.dueDate))) return res.status(400).json({ message: 'Invalid due date' });
      if (req.body.issueDate && req.body.dueDate) {
        const issue = new Date(req.body.issueDate);
        const due = new Date(req.body.dueDate);
        if (due < issue) return res.status(400).json({ message: 'Due date must be the same or after issue date' });
      }
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Don't allow updating paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot update a paid invoice' });
    }

    // If items are being updated, recalculate amounts
    if (req.body.items) {
      let subtotal = 0;
      let totalTaxAmount = 0;

      const items = req.body.items.map(item => {
        const amount = item.quantity * item.rate;
        const taxAmount = (amount * (item.taxRate || 0)) / 100;
        
        subtotal += amount;
        totalTaxAmount += taxAmount;

        return {
          ...item,
          amount,
          taxAmount
        };
      });

      const discountAmount = req.body.discountAmount || invoice.discountAmount;
      const totalAmount = subtotal + totalTaxAmount - discountAmount;

      req.body.items = items;
      req.body.subtotal = subtotal;
      req.body.taxAmount = totalTaxAmount;
      req.body.totalAmount = totalAmount;
      req.body.remainingAmount = totalAmount - invoice.paidAmount;
    }

    // Update invoice fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'userId' && key !== 'invoiceNumber') {
        invoice[key] = req.body[key];
      }
    });

    await invoice.save();
    
    const populatedInvoice = await Invoice.findById(invoice._id).populate('clientId');
    res.json({ message: 'Invoice updated successfully', invoice: populatedInvoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Don't allow deleting paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot delete a paid invoice' });
    }

    // Update client totals
    const client = await Client.findById(invoice.clientId);
    if (client) {
      client.totalInvoiced -= invoice.totalAmount;
      client.totalOutstanding -= invoice.remainingAmount;
      await client.save();
    }

    await Invoice.deleteOne({ _id: req.params.id });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark invoice as sent
router.post('/:id/send', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.status = 'sent';
    invoice.sentHistory.push({
      sentTo: req.body.sentTo,
      method: req.body.method || 'email'
    });

    await invoice.save();
    res.json({ message: 'Invoice marked as sent', invoice });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record payment
router.post('/:id/payment', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

  const { amount, paymentDate, paymentMethod, transactionId, notes } = req.body;

    // Check if payment amount exceeds remaining amount
    if (amount > invoice.remainingAmount) {
      return res.status(400).json({ message: 'Payment amount exceeds remaining balance' });
    }

    // Add payment to history (normalize method)
    const allowedMethods = ['bank_transfer', 'check', 'paypal', 'stripe', 'cash', 'upi', 'other'];
    const method = allowedMethods.includes(paymentMethod) ? paymentMethod : (paymentMethod ? 'other' : 'cash');
    invoice.paymentHistory.push({
      amount,
  paymentDate: paymentDate || new Date(),
  paymentMethod: method,
      transactionId,
      notes
    });

    // Update payment totals
    invoice.paidAmount += amount;

    // Update client totals
    const client = await Client.findById(invoice.clientId);
    if (client) {
      client.totalPaid += amount;
      client.totalOutstanding -= amount;
      await client.save();
    }

    await invoice.save();
    
    const populatedInvoice = await Invoice.findById(invoice._id).populate('clientId');
    res.json({ message: 'Payment recorded successfully', invoice: populatedInvoice });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get invoice statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id });
    
    const stats = {
      total: invoices.length,
      draft: invoices.filter(inv => inv.status === 'draft').length,
      sent: invoices.filter(inv => inv.status === 'sent').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      paidAmount: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      outstandingAmount: invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
      overdueAmount: invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.remainingAmount, 0)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// Generate and download invoice PDF based on template
router.get('/:id/download', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('clientId')
      .populate('userId', 'businessInfo name email');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Build template renderer for multiple styles
    const templateId = invoice.template || 'standard';
    const templates = {
      standard: {
        css: `
          .invoice-template.standard { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .invoice-header { display:flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { padding: 8px; border-bottom: 1px solid #ddd; text-align:left; }
          .totals { text-align:right; }
          .total-row { display:flex; justify-content: space-between; max-width: 340px; margin-left:auto; padding:4px 0; }
          .total-row.total { font-weight:bold; font-size:16px; border-top:2px solid #007bff; margin-top:8px; padding-top:8px; }
          .section-title { font-weight: bold; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .ph-table { width: 100%; border-collapse: collapse; }
          .ph-table th, .ph-table td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align:left; }
        `,
        html: ({ data }) => {
          const currency = (data.currency === 'INR' ? '₹' : (data.currency || 'INR')) + ' ';
          const itemsRows = data.items.map(i => `
            <tr>
              <td>${i.description || ''}</td>
              <td>${i.quantity}</td>
              <td>${currency}${i.rate}</td>
              <td>${currency}${(i.amount ?? (i.quantity * i.rate)).toFixed(2)}</td>
            </tr>
          `).join('');
          const phRows = (data.paymentHistory || []).map(p => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
              <td>${(p.paymentMethod || '').replace(/_/g,' ')}</td>
              <td>${p.transactionId || '-'}</td>
              <td>${currency}${Number(p.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('');
          return `
            <div class="invoice-template standard">
              <div class="invoice-header">
                <div>
                  <h1>INVOICE</h1>
                  <div style="margin:6px 0 0; font-size:12px; color:#555;">
                    <div><strong>${data.business?.name || ''}</strong></div>
                    ${data.business?.taxId ? `<div>GSTIN / Tax ID: ${data.business.taxId}</div>` : ''}
                    ${data.business?.email ? `<div>${data.business.email}</div>` : ''}
                    ${data.business?.phone ? `<div>${data.business.phone}</div>` : ''}
                  </div>
                  <div>Invoice #: ${data.invoiceNumber || ''}</div>
                  <div>Date: ${new Date(data.issueDate).toLocaleDateString('en-IN')}</div>
                  <div>Due Date: ${new Date(data.dueDate).toLocaleDateString('en-IN')}</div>
                </div>
                <div style="text-align:right">
                  <div><strong>Bill To</strong></div>
                  <div>${data.client?.name || ''}</div>
                  ${data.client?.company ? `<div>${data.client.company}</div>` : ''}
                  ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
                </div>
              </div>
              <table class="items-table">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>
              <div class="totals">
                <div class="total-row"><span>Subtotal</span><span>${currency}${data.subtotal.toFixed(2)}</span></div>
                <div class="total-row"><span>Tax</span><span>${currency}${data.taxAmount.toFixed(2)}</span></div>
                <div class="total-row"><span>Discount</span><span>-${currency}${(data.discountAmount||0).toFixed(2)}</span></div>
                <div class="total-row total"><span>Total</span><span>${currency}${data.totalAmount.toFixed(2)}</span></div>
                <div class="total-row"><span>Paid to Date</span><span>- ${currency}${Number(data.paidAmount||0).toFixed(2)}</span></div>
                <div class="total-row" style="font-weight:bold"><span>Balance Due</span><span>${currency}${Number(data.remainingAmount||0).toFixed(2)}</span></div>
              </div>
              ${data.notes ? `<div><strong>Notes:</strong><div>${data.notes}</div></div>` : ''}
              ${(data.paymentHistory && data.paymentHistory.length) ? `
                <div class="section-title">Payment History</div>
                <table class="ph-table">
                  <thead>
                    <tr><th>Date</th><th>Method</th><th>Txn ID</th><th>Amount</th></tr>
                  </thead>
                  <tbody>${phRows}</tbody>
                </table>
              ` : ''}
            </div>
          `;
        }
      },
      modern: {
        css: `
          .invoice-template.modern { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; color: #1f2937; }
          .header { display:flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
          .brand { font-size: 28px; font-weight: 800; color: #111827; }
          .badge { background:#111827; color:#fff; padding:6px 10px; border-radius: 999px; font-size:12px; letter-spacing:1px; }
          .bar { height: 4px; background: linear-gradient(90deg,#111827,#3b82f6); margin: 12px 0 20px; border-radius: 2px; }
          .items { width:100%; border-collapse: collapse; margin-bottom: 16px; }
          .items th { background:#f3f4f6; font-weight:600; padding:10px; text-align:left; }
          .items td { border-bottom:1px solid #e5e7eb; padding:10px; }
          .totals { margin-top: 10px; max-width: 360px; margin-left:auto; }
          .trow { display:flex; justify-content: space-between; padding:6px 0; }
          .trow.total { font-weight:800; font-size:16px; border-top: 2px solid #111827; margin-top:8px; padding-top:10px; }
          .section { margin-top: 18px; }
          .ph { width: 100%; border-collapse: collapse; }
          .ph th { text-align:left; font-weight:600; background:#f9fafb; padding:8px; }
          .ph td { padding:8px; border-bottom:1px solid #f3f4f6; }
        `,
        html: ({ data }) => {
          const currency = (data.currency === 'INR' ? '₹' : (data.currency || 'INR')) + ' ';
          const itemsRows = data.items.map(i => `
            <tr>
              <td>${i.description || ''}</td>
              <td>${i.quantity}</td>
              <td>${currency}${i.rate}</td>
              <td>${currency}${(i.amount ?? (i.quantity * i.rate)).toFixed(2)}</td>
            </tr>
          `).join('');
          const phRows = (data.paymentHistory || []).map(p => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
              <td>${(p.paymentMethod || '').replace(/_/g,' ')}</td>
              <td>${p.transactionId || '-'}</td>
              <td>${currency}${Number(p.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('');
          return `
            <div class="invoice-template modern">
              <div class="header">
                <div class="brand">INVOICE</div>
                <div class="badge">${data.invoiceNumber || ''}</div>
              </div>
              <div><strong>Date:</strong> ${new Date(data.issueDate).toLocaleDateString('en-IN')} &nbsp; | &nbsp; <strong>Due:</strong> ${new Date(data.dueDate).toLocaleDateString('en-IN')}</div>
              <div style="margin: 10px 0; font-size:12px; color:#4b5563;">
                <div><strong>${data.business?.name || ''}</strong></div>
                ${data.business?.taxId ? `<div>GSTIN / Tax ID: ${data.business.taxId}</div>` : ''}
                ${data.business?.email ? `<div>${data.business.email}</div>` : ''}
                ${data.business?.phone ? `<div>${data.business.phone}</div>` : ''}
              </div>
              <div class="bar"></div>
              <div style="display:flex; justify-content: space-between; margin-bottom:16px;">
                <div>
                  <div style="font-weight:700;">Bill To</div>
                  <div>${data.client?.name || ''}</div>
                  ${data.client?.company ? `<div>${data.client.company}</div>` : ''}
                  ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
                </div>
              </div>
              <table class="items">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>
              <div class="totals">
                <div class="trow"><span>Subtotal</span><span>${currency}${data.subtotal.toFixed(2)}</span></div>
                <div class="trow"><span>Tax</span><span>${currency}${data.taxAmount.toFixed(2)}</span></div>
                <div class="trow"><span>Discount</span><span>- ${currency}${(data.discountAmount||0).toFixed(2)}</span></div>
                <div class="trow total"><span>Total</span><span>${currency}${data.totalAmount.toFixed(2)}</span></div>
                <div class="trow"><span>Paid to Date</span><span>- ${currency}${Number(data.paidAmount||0).toFixed(2)}</span></div>
                <div class="trow" style="font-weight:700"><span>Balance Due</span><span>${currency}${Number(data.remainingAmount||0).toFixed(2)}</span></div>
              </div>
              ${data.notes ? `<div class="section"><strong>Notes:</strong><div>${data.notes}</div></div>` : ''}
              ${(data.paymentHistory && data.paymentHistory.length) ? `
                <div class="section"><strong>Payment History</strong></div>
                <table class="ph">
                  <thead>
                    <tr><th>Date</th><th>Method</th><th>Txn ID</th><th>Amount</th></tr>
                  </thead>
                  <tbody>${phRows}</tbody>
                </table>
              ` : ''}
            </div>
          `;
        }
      },
      minimal: {
        css: `
          .invoice-template.minimal { font-family: Georgia, 'Times New Roman', Times, serif; max-width: 760px; margin: 0 auto; padding: 24px; color: #222; }
          .title { font-size: 24px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; }
          .muted { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
          table { width:100%; border-collapse: collapse; }
          th, td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          th { text-align:left; font-weight:700; }
          .tot { max-width: 340px; margin-left:auto; }
          .row { display:flex; justify-content: space-between; padding:6px 0; }
          .row.total { font-weight:700; }
        `,
        html: ({ data }) => {
          const currency = (data.currency === 'INR' ? '₹' : (data.currency || 'INR')) + ' ';
          const itemsRows = data.items.map(i => `
            <tr>
              <td>${i.description || ''}</td>
              <td>${i.quantity}</td>
              <td>${currency}${i.rate}</td>
              <td>${currency}${(i.amount ?? (i.quantity * i.rate)).toFixed(2)}</td>
            </tr>
          `).join('');
          const phRows = (data.paymentHistory || []).map(p => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
              <td>${(p.paymentMethod || '').replace(/_/g,' ')}</td>
              <td>${p.transactionId || '-'}</td>
              <td>${currency}${Number(p.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('');
          return `
            <div class="invoice-template minimal">
              <div class="title">INVOICE</div>
              <div class="muted">#${data.invoiceNumber || ''} • ${new Date(data.issueDate).toLocaleDateString('en-IN')} • Due ${new Date(data.dueDate).toLocaleDateString('en-IN')}</div>
              <div class="muted" style="margin-top: 4px;">
                <div><strong>${data.business?.name || ''}</strong></div>
                ${data.business?.taxId ? `<div>GSTIN / Tax ID: ${data.business.taxId}</div>` : ''}
                ${data.business?.email ? `<div>${data.business.email}</div>` : ''}
                ${data.business?.phone ? `<div>${data.business.phone}</div>` : ''}
              </div>
              <div style="margin-bottom: 14px;">
                <div style="font-weight:700;">Bill To</div>
                <div>${data.client?.name || ''}</div>
                ${data.client?.company ? `<div>${data.client.company}</div>` : ''}
                ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
              </div>
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>${itemsRows}</tbody>
              </table>
              <div class="tot">
                <div class="row"><span>Subtotal</span><span>${currency}${data.subtotal.toFixed(2)}</span></div>
                <div class="row"><span>Tax</span><span>${currency}${data.taxAmount.toFixed(2)}</span></div>
                <div class="row"><span>Discount</span><span>- ${currency}${(data.discountAmount||0).toFixed(2)}</span></div>
                <div class="row total"><span>Total</span><span>${currency}${data.totalAmount.toFixed(2)}</span></div>
                <div class="row"><span>Paid</span><span>- ${currency}${Number(data.paidAmount||0).toFixed(2)}</span></div>
                <div class="row"><span><strong>Balance</strong></span><span><strong>${currency}${Number(data.remainingAmount||0).toFixed(2)}</strong></span></div>
              </div>
              ${data.notes ? `<div style="margin-top:12px"><strong>Notes:</strong> ${data.notes}</div>` : ''}
              ${(data.paymentHistory && data.paymentHistory.length) ? `
                <div style="margin-top:16px; font-weight:700;">Payment History</div>
                <table class="ph">
                  <thead>
                    <tr><th>Date</th><th>Method</th><th>Txn ID</th><th>Amount</th></tr>
                  </thead>
                  <tbody>${phRows}</tbody>
                </table>
              ` : ''}
            </div>
          `;
        }
      },
      creative: {
        css: `
          .invoice-template.creative { font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; color: #0f172a; }
          .hero { background: linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6); color:#fff; padding: 16px 20px; border-radius: 12px; margin-bottom: 16px; }
          .hero h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
          .chip { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; font-size: 12px; display:inline-block; margin-top:8px; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
          .items { width:100%; border-collapse: collapse; }
          .items th, .items td { padding: 10px; border-bottom: 1px dashed #cbd5e1; }
          .totals { max-width: 360px; margin-left:auto; }
          .row { display:flex; justify-content: space-between; padding:6px 0; }
          .row.total { font-weight:800; font-size: 16px; border-top: 2px dashed #8b5cf6; margin-top:8px; padding-top:10px; }
        `,
        html: ({ data }) => {
          const currency = (data.currency === 'INR' ? '₹' : (data.currency || 'INR')) + ' ';
          const itemsRows = data.items.map(i => `
            <tr>
              <td>${i.description || ''}</td>
              <td>${i.quantity}</td>
              <td>${currency}${i.rate}</td>
              <td>${currency}${(i.amount ?? (i.quantity * i.rate)).toFixed(2)}</td>
            </tr>
          `).join('');
          const phRows = (data.paymentHistory || []).map(p => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
              <td>${(p.paymentMethod || '').replace(/_/g,' ')}</td>
              <td>${p.transactionId || '-'}</td>
              <td>${currency}${Number(p.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('');
          return `
            <div class="invoice-template creative">
              <div class="hero">
                <h1>INVOICE</h1>
                <div class="chip">${data.invoiceNumber || ''} • ${new Date(data.issueDate).toLocaleDateString('en-IN')} → ${new Date(data.dueDate).toLocaleDateString('en-IN')}</div>
              </div>
              <div class="card">
                <div style="font-weight:700;">${data.business?.name || ''}</div>
                ${data.business?.taxId ? `<div>GSTIN / Tax ID: ${data.business.taxId}</div>` : ''}
                ${data.business?.email ? `<div>${data.business.email}</div>` : ''}
                ${data.business?.phone ? `<div>${data.business.phone}</div>` : ''}
              </div>
              <div class="card">
                <div style="font-weight:700;">Bill To</div>
                <div>${data.client?.name || ''}</div>
                ${data.client?.company ? `<div>${data.client.company}</div>` : ''}
                ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
              </div>
              <div class="card">
                <table class="items">
                  <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                  <tbody>${itemsRows}</tbody>
                </table>
              </div>
              <div class="card">
                <div class="totals">
                  <div class="row"><span>Subtotal</span><span>${currency}${data.subtotal.toFixed(2)}</span></div>
                  <div class="row"><span>Tax</span><span>${currency}${data.taxAmount.toFixed(2)}</span></div>
                  <div class="row"><span>Discount</span><span>- ${currency}${(data.discountAmount||0).toFixed(2)}</span></div>
                  <div class="row total"><span>Total</span><span>${currency}${data.totalAmount.toFixed(2)}</span></div>
                  <div class="row"><span>Paid to Date</span><span>- ${currency}${Number(data.paidAmount||0).toFixed(2)}</span></div>
                  <div class="row"><span><strong>Balance Due</strong></span><span><strong>${currency}${Number(data.remainingAmount||0).toFixed(2)}</strong></span></div>
                </div>
              </div>
              ${data.notes ? `<div class="card"><strong>Notes:</strong><div>${data.notes}</div></div>` : ''}
              ${(data.paymentHistory && data.paymentHistory.length) ? `
                <div class="card">
                  <div style="font-weight:700; margin-bottom:6px;">Payment History</div>
                  <table class="ph" style="width:100%; border-collapse: collapse;">
                    <thead>
                      <tr><th style="text-align:left;">Date</th><th style="text-align:left;">Method</th><th style="text-align:left;">Txn ID</th><th style="text-align:left;">Amount</th></tr>
                    </thead>
                    <tbody>${phRows}</tbody>
                  </table>
                </div>
              ` : ''}
            </div>
          `;
        }
      },
      corporate: {
        css: `
          .invoice-template.corporate { font-family: Arial, Helvetica, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; color: #111827; }
          .header { border-bottom: 3px solid #374151; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content: space-between; }
          .h-left h1 { margin:0; font-size: 22px; letter-spacing: 2px; }
          .h-right { text-align:right; font-size: 12px; color:#6b7280; }
          .tbl { width:100%; border-collapse: collapse; }
          .tbl th { background: #f3f4f6; font-weight:700; text-align:left; padding: 8px; }
          .tbl td { border-bottom:1px solid #e5e7eb; padding:8px; }
          .totals { max-width: 360px; margin-left:auto; }
          .row { display:flex; justify-content: space-between; padding:6px 0; }
          .row.total { font-weight:800; border-top: 2px solid #374151; margin-top:8px; padding-top:10px; }
        `,
        html: ({ data }) => {
          const currency = (data.currency === 'INR' ? '₹' : (data.currency || 'INR')) + ' ';
          const itemsRows = data.items.map(i => `
            <tr>
              <td>${i.description || ''}</td>
              <td>${i.quantity}</td>
              <td>${currency}${i.rate}</td>
              <td>${currency}${(i.amount ?? (i.quantity * i.rate)).toFixed(2)}</td>
            </tr>
          `).join('');
          const phRows = (data.paymentHistory || []).map(p => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
              <td>${(p.paymentMethod || '').replace(/_/g,' ')}</td>
              <td>${p.transactionId || '-'}</td>
              <td>${currency}${Number(p.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('');
          return `
            <div class="invoice-template corporate">
              <div class="header">
                <div class="h-left"><h1>INVOICE</h1></div>
                <div class="h-right">
                  <div>#${data.invoiceNumber || ''}</div>
                  <div>Date: ${new Date(data.issueDate).toLocaleDateString('en-IN')}</div>
                  <div>Due: ${new Date(data.dueDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <div style="margin-bottom: 8px; font-size:12px; color:#374151;">
                <div><strong>${data.business?.name || ''}</strong></div>
                ${data.business?.taxId ? `<div>GSTIN / Tax ID: ${data.business.taxId}</div>` : ''}
                ${data.business?.email ? `<div>${data.business.email}</div>` : ''}
                ${data.business?.phone ? `<div>${data.business.phone}</div>` : ''}
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-weight:700;">Bill To</div>
                <div>${data.client?.name || ''}</div>
                ${data.client?.company ? `<div>${data.client.company}</div>` : ''}
                ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
              </div>
              <table class="tbl">
                <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>${itemsRows}</tbody>
              </table>
              <div class="totals">
                <div class="row"><span>Subtotal</span><span>${currency}${data.subtotal.toFixed(2)}</span></div>
                <div class="row"><span>Tax</span><span>${currency}${data.taxAmount.toFixed(2)}</span></div>
                <div class="row"><span>Discount</span><span>- ${currency}${(data.discountAmount||0).toFixed(2)}</span></div>
                <div class="row total"><span>Total</span><span>${currency}${data.totalAmount.toFixed(2)}</span></div>
                <div class="row"><span>Paid to Date</span><span>- ${currency}${Number(data.paidAmount||0).toFixed(2)}</span></div>
                <div class="row"><span><strong>Balance Due</strong></span><span><strong>${currency}${Number(data.remainingAmount||0).toFixed(2)}</strong></span></div>
              </div>
              ${data.notes ? `<div style="margin-top:8px"><strong>Notes:</strong> ${data.notes}</div>` : ''}
              ${(data.paymentHistory && data.paymentHistory.length) ? `
                <div style="margin-top: 12px; font-weight:700;">Payment History</div>
                <table class="ph" style="width:100%; border-collapse: collapse;">
                  <thead>
                    <tr><th style="text-align:left;">Date</th><th style="text-align:left;">Method</th><th style="text-align:left;">Txn ID</th><th style="text-align:left;">Amount</th></tr>
                  </thead>
                  <tbody>${phRows}</tbody>
                </table>
              ` : ''}
            </div>
          `;
        }
      }
    };

    const template = templates[templateId] || templates.standard;

    const data = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount || 0,
      discountAmount: invoice.discountAmount || 0,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount || 0,
      remainingAmount: invoice.remainingAmount ?? (invoice.totalAmount - (invoice.paidAmount || 0)),
      paymentHistory: invoice.paymentHistory || [],
      notes: invoice.notes,
      currency: invoice.currency || 'INR',
      business: {
        name: invoice.userId?.businessInfo?.businessName || invoice.userId?.name,
        email: invoice.userId?.businessInfo?.businessEmail || invoice.userId?.email,
        phone: invoice.userId?.businessInfo?.businessPhone,
        taxId: invoice.userId?.businessInfo?.taxId,
        website: invoice.userId?.businessInfo?.website,
        address: invoice.userId?.businessInfo?.businessAddress,
      },
      client: {
        name: invoice.clientId?.name,
        email: invoice.clientId?.email,
        company: invoice.clientId?.company
      }
    };

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${template.css}</style>
        </head>
        <body>${template.html({ data })}</body>
      </html>`;

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber || 'invoice'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice error:', error);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
});