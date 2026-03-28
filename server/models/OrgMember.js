const mongoose = require('mongoose');
const memberSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:           { type: String, enum: ['owner','admin','member'], default: 'member' },
  invitedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedAt:       { type: Date, default: Date.now },
}, { timestamps: true });
// Compound unique index: one user per org
memberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
memberSchema.index({ userId: 1 });
// toJSON transform
module.exports = mongoose.model('OrgMember', memberSchema);
