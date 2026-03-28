const mongoose = require('mongoose');

const billPaymentSchema = new mongoose.Schema({
  id:     { type: String, required: true },
  amount: { type: Number, required: true },
  date:   { type: String, required: true },
  month:  { type: String, required: true },
}, { _id: false });

const recurringBillSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  amount:    { type: Number, required: true, min: 0 },
  category:  { type: String, default: 'cat_utilities' },
  accountId: { type: String, default: '' },
  dueDay:    { type: Number, default: 1 },
  frequency: { type: String, enum: ['monthly','quarterly','yearly'], default: 'monthly' },
  isActive:  { type: Boolean, default: true },
  payments:  [billPaymentSchema],
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

module.exports = mongoose.model('RecurringBill', recurringBillSchema);
