const mongoose = require('mongoose');

const signupRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, index: true },
  company: { type: String, trim: true },
  phone: { type: String, trim: true },
  notes: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'converted'], default: 'pending' },
  convertedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
}, { timestamps: true });

module.exports = mongoose.model('SignupRequest', signupRequestSchema);
