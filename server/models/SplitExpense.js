const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  name:     { type: String, required: true },
  amount:   { type: Number, required: true },
  isPaid:   { type: Boolean, default: false },
  paidDate: { type: String },
}, { _id: false });

const splitExpenseSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true },
  totalAmount:  { type: Number, required: true, min: 0 },
  date:         { type: String, required: true },
  category:     { type: String, default: 'cat_food' },
  accountId:    { type: String, default: '' },
  participants: [participantSchema],
  notes:        { type: String, default: '' },
  status:       { type: String, enum: ['active','settled'], default: 'active' },
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

module.exports = mongoose.model('SplitExpense', splitExpenseSchema);
