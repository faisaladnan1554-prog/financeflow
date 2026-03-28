const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');
const OrgSettings = require('../models/OrgSettings');

// Non-blocking migration: assign orgId to all user's existing data
async function migrateUserData(userId, orgId) {
  try {
    const models = [
      require('../models/Account'),
      require('../models/Transaction'),
      require('../models/Category'),
      require('../models/Budget'),
      require('../models/SavingsGoal'),
      require('../models/Loan'),
      require('../models/CreditCard'),
      require('../models/RecurringBill'),
      require('../models/SplitExpense'),
    ];
    await Promise.all(
      models.map(M => M.updateMany(
        { userId, organizationId: { $exists: false } },
        { $set: { organizationId: orgId } }
      ).catch(() => {}))
    );
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}

// Create org + settings for a user (called on register or first login)
async function createPersonalOrg(user) {
  const slug = `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const org = await Organization.create({
    name: `${user.name}'s Workspace`,
    slug,
    ownerId: user._id,
    plan: user.plan ?? 'free',
    planExpiry: user.planExpiry ?? null,
  });
  // Create OrgMember entry (owner)
  await OrgMember.create({ organizationId: org._id, userId: user._id, role: 'owner' });
  // Create default OrgSettings
  await OrgSettings.create({ organizationId: org._id, currency: user.currency ?? 'PKR' });
  // Update user's currentOrgId
  user.currentOrgId = org._id;
  await user.save();
  return org;
}

module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Load user for org resolution
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Resolve organization: use header override OR user's currentOrgId
    let orgId = req.headers['x-org-id'] || user.currentOrgId;

    if (!orgId) {
      // First-time migration: create personal org
      const org = await createPersonalOrg(user);
      orgId = org._id;
      // Migrate existing data in background
      migrateUserData(user._id, org._id);
    } else {
      // Verify user is a member of this org (security check)
      const membership = await OrgMember.findOne({ organizationId: orgId, userId: req.userId });
      if (!membership) {
        // Fall back to user's default org
        orgId = user.currentOrgId;
      } else {
        req.userRole = membership.role;
      }
    }

    req.organizationId = orgId?.toString();
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
