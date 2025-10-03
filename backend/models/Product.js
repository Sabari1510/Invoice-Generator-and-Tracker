const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  description: { type: String },
  rate: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'unit' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
