const mongoose = require('mongoose');
const subSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  planId:         { type: String, enum: ['free','basic','pro','enterprise'], default: 'free' },
  status:         { type: String, enum: ['active','expired','trial','cancelled'], default: 'active' },
  startDate:      { type: Date, default: Date.now },
  endDate:        { type: Date, default: null },
  paymentMethod:  { type: String, default: '' },
  transactionRef: { type: String, default: '' },
  amount:         { type: Number, default: 0 },
  currency:       { type: String, default: 'PKR' },
}, { timestamps: true, toJSON: { transform: (_, ret) => { ret.id = ret._id.toString(); ret.startDate = ret.startDate?.toISOString().split('T')[0]; ret.endDate = ret.endDate ? ret.endDate.toISOString().split('T')[0] : null; delete ret._id; delete ret.__v; return ret; } } });
subSchema.index({ organizationId: 1 });
module.exports = mongoose.model('Subscription', subSchema);
