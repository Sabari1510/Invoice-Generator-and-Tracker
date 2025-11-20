const express = require('express');
const { body, validationResult } = require('express-validator');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get all clients for a user
router.get('/', auth, async (req, res) => {
  try {
  const { page = 1, limit = 10, search = '', status = 'active' } = req.query;

    const toNumber = (v, d=10) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    const safe = (s='') => String(s).trim();
    const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const query = { userId: req.user.id };

    const searchVal = safe(search);
    if (searchVal) {
      const rx = new RegExp(escapeRegex(searchVal), 'i');
      query.$or = [
        { name: rx },
        { email: rx },
        { company: rx },
        { phone: rx },
        { taxId: rx },
        { 'address.street': rx },
        { 'address.city': rx },
        { 'address.state': rx },
        { 'address.zipCode': rx },
        { 'address.country': rx },
        { 'contactPerson.name': rx },
        { 'contactPerson.email': rx },
        { 'contactPerson.phone': rx },
      ];
    }
    // Default to only active clients unless status is explicitly set to 'all' or a specific value
    if (status && status !== 'all') {
      query.status = status;
    }

    // Show all clients by default; use filters explicitly if needed

    const lim = toNumber(limit, 10);
    const pg = toNumber(page, 1);

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .limit(lim)
      .skip((pg - 1) * lim);

    const total = await Client.countDocuments(query);

    res.json({
      clients,
      totalPages: Math.ceil(total / lim),
      currentPage: pg,
      total
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lookup potential clients by name or email across signups and existing clients (global)
router.get('/lookup', auth, async (req, res) => {
  try {
    const q = (req.query.search || '').trim();
    if (!q) return res.json({ results: [] });
    const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escapeRegex(q), 'i');

    // Find in signup requests
    const SignupRequest = require('../models/SignupRequest');
    const sr = await SignupRequest.find({ $or: [{ name: rx }, { email: rx }] }).limit(10);

    // Find in clients (across all businesses)
    const allClients = await Client.find({ $or: [{ name: rx }, { email: rx }] }).limit(10);

    // Merge by email (prefer client info over signup request for richer data)
    const map = new Map();
    for (const c of allClients) {
      const key = (c.email || '').toLowerCase();
      if (!key) continue;
      map.set(key, { name: c.name, email: c.email, company: c.company, phone: c.phone, source: 'client' });
    }
    for (const r of sr) {
      const key = (r.email || '').toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, { name: r.name, email: r.email, company: r.company, phone: r.phone, source: 'signup' });
    }

    const results = Array.from(map.values());
    return res.json({ results });
  } catch (error) {
    console.error('Lookup clients error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get a single client
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new client
router.post('/', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Client name is required'),
  body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const emailLower = req.body.email?.toLowerCase();
    // Check if client with this email already exists for this user (case-insensitive)
    const existingClient = await Client.findOne({ 
      userId: req.user.id, 
      email: emailLower 
    });
    
    if (existingClient) {
      // If the client exists (maybe previously deleted/archived), revive/update instead of blocking
      existingClient.name = req.body.name ?? existingClient.name;
      existingClient.phone = req.body.phone ?? existingClient.phone;
      existingClient.company = req.body.company ?? existingClient.company;
      existingClient.address = req.body.address ?? existingClient.address;
      existingClient.paymentTerms = req.body.paymentTerms ?? existingClient.paymentTerms;
      existingClient.status = 'active';
      if (req.body.createCredentials) {
        existingClient.password = req.body.clientPassword || Math.random().toString(36).slice(-8);
        existingClient.isApproved = true;
      }
      await existingClient.save();
      return res.status(200).json({ message: 'Client already existed; details updated', client: existingClient });
    }

    const client = new Client({
      name: req.body.name,
  email: emailLower,
      phone: req.body.phone,
      company: req.body.company,
      address: req.body.address,
      paymentTerms: req.body.paymentTerms,
      userId: req.user.id
    });

      // Normalize and validate taxId if provided
      const normalizeTax = (s) => s ? String(s).replace(/\s+/g, '').toUpperCase() : null;
      if (req.body.taxId) {
        const newTax = normalizeTax(req.body.taxId);
        // Validate GST format
        if (!/^[0-9A-Z]{15}$/.test(newTax)) return res.status(400).json({ message: 'GST / Tax ID must be 15 alphanumeric characters' });
        // Check across users and clients
        const existingUser = await User.findOne({ 'businessInfo.taxId': newTax });
        if (existingUser) return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
        const existingClientGlobal = await Client.findOne({ taxId: newTax });
        if (existingClientGlobal) return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
        client.taxId = newTax;
      }

    // Optionally create credentials
    if (req.body.createCredentials) {
      client.password = req.body.clientPassword || Math.random().toString(36).slice(-8);
      client.isApproved = true; // directly activate if owner sets password
    }

    try {
      await client.save();
    } catch (err) {
      if (err && err.code === 11000) return res.status(400).json({ message: 'Duplicate value error: GST already in use' });
      throw err;
    }
    res.status(201).json({ message: 'Client created successfully', client });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a client
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Client name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if email is being changed (normalize) and if it's already taken
    if (req.body.email && req.body.email.toLowerCase() !== client.email) {
      const existingClient = await Client.findOne({ 
        userId: req.user.id, 
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingClient) {
        return res.status(400).json({ message: 'Client with this email already exists' });
      }
    }

    // Update client fields (non-credential)
    const updatable = ['name','email','phone','company','address','paymentTerms','status','notes','preferredPaymentMethod','taxId'];
    updatable.forEach(key => {
      if (req.body[key] !== undefined) client[key] = key === 'email' ? req.body[key]?.toLowerCase() : req.body[key];
    });

    // If taxId provided and changed, normalize and ensure uniqueness
    if (req.body.taxId && req.body.taxId !== client.taxId) {
      const normalizeTax = (s) => s ? String(s).replace(/\s+/g, '').toUpperCase() : null;
      const newTax = normalizeTax(req.body.taxId);
      if (!/^[0-9A-Z]{15}$/.test(newTax)) return res.status(400).json({ message: 'GST / Tax ID must be 15 alphanumeric characters' });
      const existingUser = await User.findOne({ 'businessInfo.taxId': newTax });
      if (existingUser) return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
      const existingClientGlobal = await Client.findOne({ taxId: newTax, _id: { $ne: req.params.id } });
      if (existingClientGlobal) return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
      client.taxId = newTax;
    }

    // Optionally update credentials and reactivate
    if (req.body.createCredentials) {
      client.password = req.body.clientPassword || Math.random().toString(36).slice(-8);
      client.isApproved = true;
      client.status = 'active';
    }

    try {
      await client.save();
    } catch (err) {
      if (err && err.code === 11000) return res.status(400).json({ message: 'Duplicate value error: GST already in use' });
      throw err;
    }
    res.json({ message: 'Client updated successfully', client });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a client
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Soft-delete: mark inactive and remove credentials so it can be restored/added again later
    client.status = 'inactive';
    client.password = undefined;
    client.isApproved = false;
    client.approvalToken = undefined;
    await client.save();
    res.json({ message: 'Client archived successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const invoices = await Invoice.find({ clientId: req.params.id, userId: req.user.id });
    
    const stats = {
      totalInvoices: invoices.length,
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
      overdueAmount: invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.remainingAmount, 0),
      statusBreakdown: {
        draft: invoices.filter(inv => inv.status === 'draft').length,
        sent: invoices.filter(inv => inv.status === 'sent').length,
        paid: invoices.filter(inv => inv.status === 'paid').length,
        overdue: invoices.filter(inv => inv.status === 'overdue').length
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove client credentials
router.delete('/:id/credentials', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    client.password = undefined;
    client.isApproved = false;
    client.approvalToken = undefined;
    await client.save();
    return res.json({ message: 'Client credentials removed' });
  } catch (error) {
    console.error('Remove client credentials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;