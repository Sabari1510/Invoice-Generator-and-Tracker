const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  userType: {
    type: String,
    enum: ['business'],
    required: [true, 'User type is required']
  },
  businessInfo: {
    businessName: {
      type: String,
      trim: true
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    businessPhone: String,
    businessEmail: String,
    taxId: String,
    website: String,
    logo: String
  },
  // removed freelancerInfo since app supports business + client portal
  bankDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String
  },
  settings: {
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    invoicePrefix: {
      type: String,
      default: 'INV'
    },
    invoiceTemplate: {
      type: String,
      default: 'standard'
    },
    paymentTerms: {
      type: String,
      default: 'Net 30'
    },
    lateFee: {
      type: Number,
      default: 0
    },
    autoReminders: {
      type: Boolean,
      default: true
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide password and sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  return user;
};

module.exports = mongoose.model('User', userSchema);