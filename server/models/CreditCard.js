const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  name:           { type: String, required: true },
  bank:           { type: String, default: '' },
  last4:          { type: String, default: '' },
  creditLimit:    { type: Number, required: true, min: 0 },
  currentBalance: { type: Number, default: 0 },
  billingDay:     { type: Number, default: 1 },
  dueDay:         { type: Number, default: 25 },
  color:          { type: String, default: '#1E3A8A' },
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString().split('T')[0];
      delete ret._id; delete ret.__v; delete ret.userId;
      return ret;
    }
  }
});

module.exports = mongoose.model('CreditCard', creditCardSchema);
