const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  description: { type: String },
  rate: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'unit' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ userId: 1, name: 1 }, { unique: true });
// Ensure per-user SKU is numeric and unique when provided
productSchema.path('sku').validate(function(v) {
  if (v === undefined || v === null || v === '') return true; // optional
  return /^\d+$/.test(String(v));
}, 'SKU must contain only digits');
productSchema.index({ userId: 1, sku: 1 }, { unique: true, sparse: true });

// Ensure SKU is normalized and validated at schema level before validation
productSchema.pre('validate', function(next) {
  if (this.sku !== undefined && this.sku !== null) {
    const s = String(this.sku).trim();
    if (s === '') {
      this.sku = undefined;
      return next();
    }
    if (!/^\d+$/.test(s)) {
      this.invalidate('sku', 'SKU must contain only digits');
      return next(new Error('SKU must contain only digits'));
    }
    this.sku = s;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
