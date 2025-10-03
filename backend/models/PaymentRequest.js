const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  businessUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  date: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'check', 'paypal', 'stripe', 'cash', 'upi', 'other'],
    default: 'cash'
  },
  transactionId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  notes: String,
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

paymentRequestSchema.index({ businessUserId: 1, clientId: 1, invoiceId: 1, status: 1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
