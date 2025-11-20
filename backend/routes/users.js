const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const user = await User.findById(req.user.id);

    // Check if email is being changed and if it's already taken
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update user fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update business information
router.put('/business-info', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.userType !== 'business') {
      return res.status(400).json({ message: 'This endpoint is only for business users' });
    }

    const normalizeTax = (s) => s ? String(s).replace(/\s+/g, '').toUpperCase() : null;
    const isValidGst = (v) => /^[0-9A-Z]{15}$/.test(v);
    const normalizeBusinessName = (s) => s ? String(s).trim() : null;
    const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // If taxId is being updated, ensure uniqueness across users and clients
    if (req.body && req.body.taxId) {
      const newTax = normalizeTax(req.body.taxId);
      const currentTax = normalizeTax(user.businessInfo && user.businessInfo.taxId);
      if (!isValidGst(newTax)) {
        return res.status(400).json({ message: 'GST / Tax ID must be 15 alphanumeric characters' });
      }
      if (newTax !== currentTax) {
        const existingUser = await User.findOne({ 'businessInfo.taxId': newTax });
        if (existingUser) {
          return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
        }
        const existingClient = await Client.findOne({ taxId: newTax });
        if (existingClient) {
          return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
        }
        req.body.taxId = newTax;
      }
    }

    // Prevent duplicate business name / business email across users
    if (req.body && req.body.businessName) {
      const bn = normalizeBusinessName(req.body.businessName);
      const rx = new RegExp('^' + escapeRegex(bn) + '$', 'i');
      const existingByName = await User.findOne({ 'businessInfo.businessName': rx, _id: { $ne: user._id } });
      if (existingByName) return res.status(400).json({ message: 'A business with the same name is already registered' });
    }
    if (req.body && req.body.businessEmail) {
      const existingByBEmail = await User.findOne({ 'businessInfo.businessEmail': req.body.businessEmail, _id: { $ne: user._id } });
      if (existingByBEmail) return res.status(400).json({ message: 'Business email already in use by another account' });
    }

    user.businessInfo = { ...user.businessInfo, ...req.body };
    try {
      await user.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(400).json({ message: 'Duplicate value error: GST already in use' });
      }
      throw err;
    }

    res.json({ message: 'Business information updated successfully', user });
  } catch (error) {
    console.error('Update business info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update bank details
router.put('/bank-details', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.bankDetails = { ...user.bankDetails, ...req.body };
    await user.save();

    res.json({ message: 'Bank details updated successfully' });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.put('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.settings = { ...user.settings, ...req.body };
    await user.save();

    res.json({ message: 'Settings updated successfully', settings: user.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;