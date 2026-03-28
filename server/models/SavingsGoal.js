const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  name:          { type: String, required: true },
  targetAmount:  { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0 },
  deadline:      { type: String, default: '' },
  priority:      { type: String, enum: ['low','medium','high'], default: 'medium' },
  icon:          { type: String, default: '🎯' },
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

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
