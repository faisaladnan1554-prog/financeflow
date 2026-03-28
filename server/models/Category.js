const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  name:      { type: String, required: true },
  type:      { type: String, enum: ['income', 'expense'], required: true },
  icon:      { type: String, default: '📦' },
  color:     { type: String, default: '#6B7280' },
  isDefault: { type: Boolean, default: false },
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

module.exports = mongoose.model('Category', categorySchema);
