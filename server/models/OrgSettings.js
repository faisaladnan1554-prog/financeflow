const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  appName:        { type: String, default: 'FinanceFlow' },
  logoUrl:        { type: String, default: '' },
  primaryColor:   { type: String, default: '#2563EB' },
  secondaryColor: { type: String, default: '#7C3AED' },
  accentColor:    { type: String, default: '#10B981' },
  mode:           { type: String, enum: ['light','dark'], default: 'light' },
  currency:       { type: String, default: 'PKR' },
}, { timestamps: true, toJSON: { transform: (_, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; } } });
module.exports = mongoose.model('OrgSettings', settingsSchema);
