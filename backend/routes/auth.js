const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['business']).withMessage('User type must be business')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, userType, businessInfo } = req.body;

    const normalizeTax = (s) => s ? String(s).replace(/\s+/g, '').toUpperCase() : null;
    const normalizeBusinessName = (s) => s ? String(s).trim() : null;
    const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isValidGst = (v) => /^[0-9A-Z]{15}$/.test(v);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Ensure business name provided for business users
    if (userType === 'business') {
      if (!businessInfo || !businessInfo.businessName || !String(businessInfo.businessName).trim()) {
        return res.status(400).json({ message: 'Company name is required for business signup' });
      }
    }

    // If taxId provided, ensure uniqueness across users and clients
    if (businessInfo && businessInfo.taxId) {
      const normalizedTax = normalizeTax(businessInfo.taxId);
      if (!isValidGst(normalizedTax)) {
        return res.status(400).json({ message: 'GST / Tax ID must be 15 alphanumeric characters' });
      }
      const existingUserWithTax = await User.findOne({ 'businessInfo.taxId': normalizedTax });
      if (existingUserWithTax) {
        return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
      }
      const existingClientWithTax = await Client.findOne({ taxId: normalizedTax });
      if (existingClientWithTax) {
        return res.status(400).json({ message: 'GST / Tax ID already in use by another account' });
      }
      businessInfo.taxId = normalizedTax;
    }

    // Prevent duplicate business name/details across registered users
    if (businessInfo && businessInfo.businessName) {
      const bn = normalizeBusinessName(businessInfo.businessName);
      const rx = new RegExp('^' + escapeRegex(bn) + '$', 'i');
      const existingByName = await User.findOne({ 'businessInfo.businessName': rx });
      if (existingByName) {
        return res.status(400).json({ message: 'A business with the same name is already registered' });
      }
      if (businessInfo.businessEmail) {
        const existingByBEmail = await User.findOne({ 'businessInfo.businessEmail': businessInfo.businessEmail });
        if (existingByBEmail) return res.status(400).json({ message: 'Business email already in use by another account' });
      }
    }

    // Create new user and capture initial business info
    const user = new User({
      name,
      email,
      password,
      userType,
      businessInfo: businessInfo ? {
        businessName: businessInfo.businessName?.trim(),
        businessEmail: businessInfo.businessEmail,
        businessPhone: businessInfo.businessPhone,
        taxId: businessInfo.taxId,
        website: businessInfo.website,
        businessAddress: {
          street: businessInfo.businessAddress?.street,
          city: businessInfo.businessAddress?.city,
          state: businessInfo.businessAddress?.state,
          zipCode: businessInfo.businessAddress?.zipCode,
          country: businessInfo.businessAddress?.country,
        }
      } : undefined
    });

    try {
      await user.save();
    } catch (err) {
      // Handle duplicate key error (e.g., unique index on taxId/email)
      if (err && err.code === 11000) {
        return res.status(400).json({ message: 'Duplicate value error: GST/Email already in use' });
      }
      throw err;
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        businessInfo: user.businessInfo
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;