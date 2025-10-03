const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  amount: {
    type: Number,
    required: true
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0
  }
});

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  },
  template: {
    type: String,
    default: 'standard'
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDate: Date,
    endDate: Date
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    paymentDate: {
      type: Date,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'check', 'paypal', 'stripe', 'cash', 'upi', 'other']
    },
    transactionId: String,
    notes: String
  }],
  sentHistory: [{
    sentDate: {
      type: Date,
      default: Date.now
    },
    sentTo: String,
    method: {
      type: String,
      enum: ['email', 'download', 'print']
    }
  }],
  reminders: [{
    type: {
      type: String,
      enum: ['auto', 'manual']
    },
    sentDate: {
      type: Date,
      default: Date.now
    },
    daysOverdue: Number
  }],
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  viewedAt: Date,
  paidAt: Date
}, {
  timestamps: true
});

// Auto-generate invoice number
invoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const prefix = process.env.INVOICE_PREFIX || 'INV';
    const count = await mongoose.model('Invoice').countDocuments({ userId: this.userId });
    this.invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

invoiceSchema.pre('save', async function(next) {
  // invoiceNumber is expected to already be set in pre('validate')
  
  // Calculate remaining amount
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  // Update status based on payment
  if (this.paidAmount >= this.totalAmount && this.status !== 'paid') {
    this.status = 'paid';
    this.paidAt = new Date();
  } else if (this.dueDate < new Date() && this.status === 'sent' && this.paidAmount < this.totalAmount) {
    this.status = 'overdue';
  }
  
  next();
});

// Index for better query performance
// Ensure uniqueness of invoice numbers per user
invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);