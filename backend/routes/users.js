const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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

    user.businessInfo = { ...user.businessInfo, ...req.body };
    await user.save();

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