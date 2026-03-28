const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId:     { type: String, required: true },
  monthlyLimit:   { type: Number, required: true, min: 0 },
  spent:          { type: Number, default: 0 },
  month:          { type: String, required: true },   // YYYY-MM
  alertThreshold: { type: Number, default: 80 },
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

module.exports = mongoose.model('Budget', budgetSchema);
