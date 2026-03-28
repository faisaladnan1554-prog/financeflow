const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, required: true, minlength: 6 },
  currency:         { type: String, default: 'PKR' },
  language:         { type: String, default: 'en' },
  fiscalMonthStart: { type: Number, default: 1 },
  loginTime:        { type: Date },
  plan:             { type: String, enum: ['free','basic','pro','enterprise'], default: 'free' },
  planExpiry:       { type: Date, default: null },
  aiApiKey:         { type: String, default: '' },
  aiProvider:       { type: String, enum: ['openai','anthropic'], default: 'openai' },
  currentOrgId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  role:             { type: String, enum: ['owner','admin','member'], default: 'owner' },
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      ret.createdAt = ret.createdAt?.toISOString().split('T')[0];
      ret.loginTime = ret.loginTime?.toISOString();
      ret.planExpiry = ret.planExpiry ? ret.planExpiry.toISOString() : null;
      ret.currentOrgId = ret.currentOrgId ? ret.currentOrgId.toString() : null;
      // role is already a plain string, no transform needed
      delete ret._id; delete ret.__v; delete ret.password; delete ret.aiApiKey;
      return ret;
    }
  }
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
