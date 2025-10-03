const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

// List products
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, active = '' } = req.query;
    const q = { userId: req.user.id };
    if (search) q.name = { $regex: search, $options: 'i' };
    if (active) q.active = active === 'true';
    const products = await Product.find(q).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Product.countDocuments(q);
    return res.json({ products, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    console.error('List products error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create product
router.post('/', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('rate').isFloat({ min: 0 }).withMessage('Rate must be >= 0'),
  body('taxRate').optional().isFloat({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const product = await Product.create({ userId: req.user.id, ...req.body });
    return res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Product name already exists' });
    console.error('Create product error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    Object.keys(req.body).forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
    await product.save();
    return res.json({ message: 'Product updated', product });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await Product.deleteOne({ _id: req.params.id });
    return res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
