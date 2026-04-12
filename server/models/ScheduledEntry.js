const mongoose = require('mongoose');

const scheduledEntrySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  type:        { type: String, enum: ['income', 'expense'], required: true },
  title:       { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: String, required: true },   // YYYY-MM-DD — when it should be applied
  accountId:   { type: String, required: true },
  categoryId:  { type: String, default: '' },
  notes:       { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'applied', 'cancelled'], default: 'pending' },
  transactionId: { type: String, default: '' },    // filled when applied
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

module.exports = mongoose.model('ScheduledEntry', scheduledEntrySchema);
