const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  type:        { type: String, enum: ['income','expense','transfer'], required: true },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: String, required: true },   // YYYY-MM-DD string
  category:    { type: String, required: true },   // category id reference
  accountId:   { type: String, required: true },
  toAccountId: { type: String },
  notes:       { type: String, default: '' },
  attachment:  { type: String },
  recurring:   {
    frequency: { type: String, enum: ['daily','weekly','monthly','yearly'] },
    endDate:   { type: String },
  },
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

// Index for fast queries by user + date
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
