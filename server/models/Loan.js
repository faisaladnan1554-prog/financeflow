const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  id:     { type: String, required: true },
  amount: { type: Number, required: true },
  date:   { type: String, required: true },
  notes:  { type: String, default: '' },
}, { _id: false });

const loanSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  direction:       { type: String, enum: ['given','taken'], required: true },
  personName:      { type: String, required: true },
  amount:          { type: Number, required: true, min: 0 },
  remainingAmount: { type: Number, required: true, min: 0 },
  dueDate:         { type: String, default: '' },
  interestRate:    { type: Number, default: 0 },
  status:          { type: String, enum: ['active','settled'], default: 'active' },
  notes:           { type: String, default: '' },
  payments:        [paymentSchema],
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

module.exports = mongoose.model('Loan', loanSchema);
