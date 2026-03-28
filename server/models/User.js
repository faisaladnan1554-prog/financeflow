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
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      ret.createdAt = ret.createdAt?.toISOString().split('T')[0];
      ret.loginTime = ret.loginTime?.toISOString();
      delete ret._id; delete ret.__v; delete ret.password;
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
