const mongoose = require('mongoose');
const orgSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  slug:       { type: String, unique: true, lowercase: true, trim: true },
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:       { type: String, enum: ['free','basic','pro','enterprise'], default: 'free' },
  planExpiry: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      ret.planExpiry = ret.planExpiry ? ret.planExpiry.toISOString() : null;
      ret.createdAt = ret.createdAt?.toISOString().split('T')[0];
      delete ret._id; delete ret.__v;
      return ret;
    }
  }
});
module.exports = mongoose.model('Organization', orgSchema);
