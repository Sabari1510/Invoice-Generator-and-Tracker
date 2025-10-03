const express = require('express');
const { body, validationResult } = require('express-validator');
const SignupRequest = require('../models/SignupRequest');
const ProfileRequest = require('../models/ProfileRequest');
const Client = require('../models/Client');
const User = require('../models/User');
const userAuth = require('../middleware/auth');

const router = express.Router();

// Public: Client self-signup (create account immediately, no approvals)
router.post('/public/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match'),
  body('company').optional().isString(),
  body('phone').optional().isString(),
  body('notes').optional().isString(),
  body('businessUserId').optional().isMongoId(),
  body('businessEmail').optional().isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, company, phone, notes, businessUserId, businessEmail } = req.body;
  try {
    // Resolve business target by id/email or fallback to env/first business
    let targetBusinessId = businessUserId;
    if (!targetBusinessId && businessEmail) {
      const biz = await User.findOne({ email: businessEmail.toLowerCase() });
      if (!biz) return res.status(400).json({ message: 'Business not found' });
      targetBusinessId = biz._id;
    }
    if (!targetBusinessId) {
      const { DEFAULT_BUSINESS_ID, BUSINESS_EMAIL } = process.env;
      if (DEFAULT_BUSINESS_ID) {
        targetBusinessId = DEFAULT_BUSINESS_ID;
      } else if (BUSINESS_EMAIL) {
        const biz = await User.findOne({ email: BUSINESS_EMAIL.toLowerCase() });
        if (biz) targetBusinessId = biz._id;
      }
      if (!targetBusinessId) {
        const firstBiz = await User.findOne().sort({ createdAt: 1 });
        if (firstBiz) targetBusinessId = firstBiz._id;
      }
    }
    if (!targetBusinessId) return res.status(400).json({ message: 'No business is configured to receive signups' });

    const lowerEmail = email.toLowerCase();
    let client = await Client.findOne({ userId: targetBusinessId, email: lowerEmail });
    if (client) {
      client.name = name || client.name;
      client.company = company || client.company;
      client.phone = phone || client.phone;
      client.password = password; // hashed by pre-save hook
      client.isApproved = true;
      client.status = 'active';
      await client.save();
    } else {
      client = await Client.create({
        userId: targetBusinessId,
        name,
        email: lowerEmail,
        company,
        phone,
        password, // will be hashed
        status: 'active',
        isApproved: true,
      });
    }

    // Audit: record/mark signup request as converted
    await SignupRequest.create({ name, email: lowerEmail, company, phone, notes, status: 'converted', convertedClientId: client._id });

    return res.status(201).json({ message: 'Client account created', client });
  } catch (err) {
    console.error('Public signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Public: Submit a profile request to a specific business (asks for approval)
router.post('/public/profile-request', [
  body('businessUserId').optional().isMongoId(),
  body('businessEmail').optional().isEmail(),
  body('name').notEmpty(),
  body('email').isEmail(),
  body('company').optional().isString(),
  body('phone').optional().isString(),
  body('address').optional().isObject(),
  body('taxId').optional().isString(),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    // Resolve business target by id or email
    let targetBusinessId = req.body.businessUserId;
    if (!targetBusinessId && req.body.businessEmail) {
      const biz = await User.findOne({ email: req.body.businessEmail.toLowerCase() });
      if (!biz) return res.status(400).json({ message: 'Business not found' });
      targetBusinessId = biz._id;
    }
    if (!targetBusinessId) return res.status(400).json({ message: 'Business id or email is required' });

    const pr = await ProfileRequest.create({
      businessUserId: targetBusinessId,
      name: req.body.name,
      email: req.body.email.toLowerCase(),
      company: req.body.company,
      phone: req.body.phone,
      address: req.body.address,
      taxId: req.body.taxId,
      notes: req.body.notes,
    });
    return res.status(201).json({ message: 'Profile request submitted', request: pr });
  } catch (err) {
    console.error('Profile request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Business: list pending profile requests for me
router.get('/profile-requests', userAuth, async (req, res) => {
  try {
    const requests = await ProfileRequest.find({ businessUserId: req.user.id, status: 'pending' }).sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    console.error('List profile requests error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Business: approve a profile request -> create/link client
router.post('/profile-requests/:id/approve', userAuth, async (req, res) => {
  try {
    const pr = await ProfileRequest.findOne({ _id: req.params.id, businessUserId: req.user.id, status: 'pending' });
    if (!pr) return res.status(404).json({ message: 'Request not found' });

    const client = await Client.create({
      userId: req.user.id,
      name: pr.name,
      email: pr.email,
      company: pr.company,
      phone: pr.phone,
      address: pr.address,
      taxId: pr.taxId,
      status: 'active',
      isApproved: false,
    });

    pr.status = 'approved';
    pr.reviewedAt = new Date();
    pr.reviewedBy = req.user.id;
    await pr.save();

    return res.json({ message: 'Client created from profile request', client });
  } catch (err) {
    console.error('Approve profile request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Business: reject a profile request
router.post('/profile-requests/:id/reject', userAuth, async (req, res) => {
  try {
    const pr = await ProfileRequest.findOne({ _id: req.params.id, businessUserId: req.user.id, status: 'pending' });
    if (!pr) return res.status(404).json({ message: 'Request not found' });
    pr.status = 'rejected';
    pr.reviewedAt = new Date();
    pr.reviewedBy = req.user.id;
    await pr.save();
    return res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('Reject profile request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
/**
 * Business endpoints: manage and convert signup requests
 */
router.get('/signup-requests', userAuth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const toNumber = (v, d=10) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const safe = (s='') => String(s).trim();
    const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const q = { status: 'pending' };
    const s = safe(search);
    if (s) {
      const rx = new RegExp(escapeRegex(s), 'i');
      q.$or = [ { name: rx }, { email: rx }, { company: rx }, { phone: rx } ];
    }
    const lim = toNumber(limit, 10);
    const pg = toNumber(page, 1);
    const requests = await SignupRequest.find(q).sort({ createdAt: -1 }).limit(lim).skip((pg - 1) * lim);
    const total = await SignupRequest.countDocuments(q);
    return res.json({ requests, total, totalPages: Math.ceil(total / lim), currentPage: pg });
  } catch (err) {
    console.error('List signup requests error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/signup-requests/:id/convert', userAuth, async (req, res) => {
  try {
    const r = await SignupRequest.findById(req.params.id);
    if (!r || r.status !== 'pending') return res.status(404).json({ message: 'Request not found' });
    // prevent duplicate clients per business
    const existing = await Client.findOne({ userId: req.user.id, email: r.email });
    if (existing) return res.status(400).json({ message: 'Client with this email already exists' });
    const client = await Client.create({
      userId: req.user.id,
      name: r.name,
      email: r.email,
      company: r.company,
      phone: r.phone,
      status: 'active',
      isApproved: false,
    });
    r.status = 'converted';
    r.convertedClientId = client._id;
    await r.save();
    return res.json({ message: 'Client added from signup request', client });
  } catch (err) {
    console.error('Convert signup request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
