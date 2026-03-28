const mongoose = require('mongoose');

const toJSON = {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString().split('T')[0];
    delete ret._id; delete ret.__v; delete ret.userId;
    return ret;
  }
};

const accountSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  type:     { type: String, enum: ['cash','checking','savings','mobile_wallet','investment'], default: 'cash' },
  balance:  { type: Number, default: 0 },
  currency: { type: String, default: 'PKR' },
  icon:     { type: String, default: '💵' },
  color:    { type: String, default: '#2563EB' },
}, { timestamps: true, toJSON });

module.exports = mongoose.model('Account', accountSchema);
