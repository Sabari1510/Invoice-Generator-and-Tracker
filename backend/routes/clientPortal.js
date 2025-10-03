const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const PaymentRequest = require('../models/PaymentRequest');

const router = express.Router();

// Create a lightweight auth middleware for client portal using a different secret
const clientAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET);
    const client = await Client.findById(decoded.clientId);
    if (!client || !client.isApproved) {
      return res.status(401).json({ message: 'Invalid client session' });
    }

    req.client = client;
    next();
  } catch (err) {
    console.error('Client auth error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Business owner invites/creates a client -> generate approval token
router.post('/invite', [
  body('clientId').isMongoId().withMessage('clientId is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = await Client.findById(req.body.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Generate a simple approval token
    const approvalToken = jwt.sign({ clientId: client._id }, process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
    client.approvalToken = approvalToken;
    await client.save();

    // In production, send email with this link
    const approvalLink = `${process.env.CLIENT_PORTAL_URL || 'http://localhost:3000'}/client/approve?token=${approvalToken}`;
    return res.json({ message: 'Client invite created', approvalLink });
  } catch (err) {
    console.error('Invite client error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Client verifies token and sets password
router.post('/approve', [
  body('token').exists().withMessage('token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const client = await Client.findById(decoded.clientId);
    if (!client || client.approvalToken !== token) {
      return res.status(400).json({ message: 'Invalid approval token' });
    }

    client.password = password; // will be hashed by pre-save hook
    client.isApproved = true;
    client.approvalToken = undefined;
    await client.save();

    return res.json({ message: 'Client account activated. You can now log in.' });
  } catch (err) {
    console.error('Approve client error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Client login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const lower = email.toLowerCase();
    // Pull all candidates with this email to determine best match and approval state
    const candidatesAny = await Client.find({ email: lower }).sort({ updatedAt: -1 });
    let client = null;
    let matchedButUnapproved = false;
    for (const c of candidatesAny) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await c.comparePassword(password);
      if (ok && c.isApproved) { client = c; break; }
      if (ok && !c.isApproved) matchedButUnapproved = true;
    }
    if (!client) {
      if (matchedButUnapproved) {
        return res.status(403).json({ message: 'Your account is not activated yet. Please contact the business.' });
      }
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    client.lastLogin = new Date();
    await client.save();

    const token = jwt.sign({ clientId: client._id }, process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        company: client.company,
      }
    });
  } catch (err) {
    console.error('Client login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get client profile
router.get('/me', clientAuth, async (req, res) => {
  return res.json({ client: {
    id: req.client._id,
    name: req.client.name,
    email: req.client.email,
    company: req.client.company,
  }});
});

// List client's invoices (only those belonging to this client)
router.get('/invoices', clientAuth, async (req, res) => {
  try {
    // Show invoices for this client's business across any client record with the same email
    const businessId = req.client.userId;
    const email = (req.client.email || '').toLowerCase();
    const Client = require('../models/Client');
    const peers = await Client.find({ userId: businessId, email }).select('_id');
    const clientIds = peers.length ? peers.map(c => c._id) : [req.client._id];

    // Include draft so clients can see invoices even before marked as sent
    const allowedStatuses = ['draft', 'sent', 'viewed', 'overdue', 'paid'];
    const invoices = await Invoice.find({ userId: businessId, clientId: { $in: clientIds }, status: { $in: allowedStatuses } })
      .populate('userId', 'businessInfo name')
      .sort({ createdAt: -1 });
    return res.json({ invoices });
  } catch (err) {
    console.error('Client invoices error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit a payment update request for an invoice
router.post('/invoices/:id/payment-request', clientAuth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('date').optional().isISO8601().withMessage('Date must be ISO8601'),
  body('method').optional().isIn(['bank_transfer', 'check', 'paypal', 'stripe', 'cash', 'upi', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const invoice = await Invoice.findOne({ _id: req.params.id, clientId: req.client._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const amount = Number(req.body.amount);
    if (amount > invoice.remainingAmount) {
      return res.status(400).json({ message: 'Amount exceeds remaining balance' });
    }

    const pr = await PaymentRequest.create({
      invoiceId: invoice._id,
      businessUserId: invoice.userId,
      clientId: req.client._id,
      amount,
      date: req.body.date || new Date(),
      method: req.body.method || 'cash',
      transactionId: req.body.transactionId,
      notes: req.body.notes,
      status: 'pending',
    });

    return res.status(201).json({ message: 'Payment request submitted', request: pr });
  } catch (err) {
    console.error('Create payment request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Business owner endpoints (must be protected by owner auth in main app middleware)
// For simplicity, reusing user auth middleware from main app would be better, but we define routes here to be mounted under /api/client-portal/admin

const userAuth = require('../middleware/auth');

// List pending payment requests for the authenticated business owner
router.get('/admin/payment-requests', userAuth, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const requests = await PaymentRequest.find({ businessUserId: req.user.id, status })
      .populate('invoiceId')
      .populate('clientId');
    return res.json({ requests });
  } catch (err) {
    console.error('List payment requests error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Approve a payment request and apply payment to the invoice
router.post('/admin/payment-requests/:id/approve', userAuth, async (req, res) => {
  try {
    const pr = await PaymentRequest.findOne({ _id: req.params.id, businessUserId: req.user.id });
    if (!pr) return res.status(404).json({ message: 'Payment request not found' });
    if (pr.status !== 'pending') return res.status(400).json({ message: 'Request is not pending' });

    const invoice = await Invoice.findById(pr.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (pr.amount > invoice.remainingAmount) {
      return res.status(400).json({ message: 'Amount exceeds remaining balance' });
    }

    // Apply payment
    const allowedMethods = ['bank_transfer', 'check', 'paypal', 'stripe', 'cash', 'upi', 'other'];
    const method = allowedMethods.includes(pr.method) ? pr.method : 'other';
    invoice.paymentHistory.push({
      amount: pr.amount,
      paymentDate: pr.date || new Date(),
      paymentMethod: method,
      transactionId: pr.transactionId,
      notes: (pr.notes ? `Client submitted: ${pr.notes}` : 'Client-submitted payment approved'),
    });
    invoice.paidAmount += pr.amount;
    await invoice.save();

    // Update client aggregates
    const client = await Client.findById(pr.clientId);
    if (client) {
      client.totalPaid += pr.amount;
      client.totalOutstanding -= pr.amount;
      await client.save();
    }

    pr.status = 'approved';
    pr.reviewedAt = new Date();
    pr.reviewedBy = req.user.id;
    await pr.save();

    return res.json({ message: 'Payment request approved and applied', request: pr, invoice });
  } catch (err) {
    console.error('Approve payment request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Reject a payment request
router.post('/admin/payment-requests/:id/reject', userAuth, async (req, res) => {
  try {
    const pr = await PaymentRequest.findOne({ _id: req.params.id, businessUserId: req.user.id });
    if (!pr) return res.status(404).json({ message: 'Payment request not found' });
    if (pr.status !== 'pending') return res.status(400).json({ message: 'Request is not pending' });

    pr.status = 'rejected';
    pr.reviewedAt = new Date();
    pr.reviewedBy = req.user.id;
    await pr.save();

    return res.json({ message: 'Payment request rejected', request: pr });
  } catch (err) {
    console.error('Reject payment request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
