const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');
const OrgSettings = require('../models/OrgSettings');
const User = require('../models/User');

// GET /api/orgs — list user's orgs
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await OrgMember.find({ userId: req.userId });
    const orgIds = memberships.map(m => m.organizationId);
    const orgs = await Organization.find({ _id: { $in: orgIds } });
    const result = orgs.map(org => ({
      ...org.toJSON(),
      role: memberships.find(m => m.organizationId.toString() === org.id)?.role,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orgs/current — get current org with settings + members
router.get('/current', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const members = await OrgMember.find({ organizationId: req.organizationId })
      .populate('userId', 'name email createdAt');
    const settings = await OrgSettings.findOne({ organizationId: req.organizationId });
    res.json({ org: org.toJSON(), members, settings: settings?.toJSON() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orgs/current — update org name
router.put('/current', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const org = await Organization.findByIdAndUpdate(req.organizationId, { name }, { new: true });
    res.json(org);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/orgs/invite — add member (owner/admin only)
router.post('/invite', auth, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    // Check requester is owner or admin
    const myMembership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.userId });
    if (!['owner','admin'].includes(myMembership?.role)) return res.status(403).json({ error: 'Permission denied' });

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) return res.status(404).json({ error: 'User not found. They must register first.' });

    const existing = await OrgMember.findOne({ organizationId: req.organizationId, userId: targetUser._id });
    if (existing) return res.status(409).json({ error: 'User is already a member' });

    const member = await OrgMember.create({
      organizationId: req.organizationId,
      userId: targetUser._id,
      role,
      invitedBy: req.userId,
    });

    // Update their currentOrgId if they don't have one
    // (Don't force-switch their org)

    res.status(201).json({ message: `${targetUser.name} added to workspace`, member });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/orgs/members/:userId/role — change role (owner only)
router.put('/members/:targetUserId/role', auth, async (req, res) => {
  try {
    const myMembership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.userId });
    if (myMembership?.role !== 'owner') return res.status(403).json({ error: 'Only owner can change roles' });
    const { role } = req.body;
    const member = await OrgMember.findOneAndUpdate(
      { organizationId: req.organizationId, userId: req.params.targetUserId },
      { role }, { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/orgs/members/:userId — remove member
router.delete('/members/:targetUserId', auth, async (req, res) => {
  try {
    const myMembership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.userId });
    if (!['owner','admin'].includes(myMembership?.role)) return res.status(403).json({ error: 'Permission denied' });
    // Cannot remove owner
    const targetMembership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.params.targetUserId });
    if (targetMembership?.role === 'owner') return res.status(400).json({ error: 'Cannot remove org owner' });
    await OrgMember.findOneAndDelete({ organizationId: req.organizationId, userId: req.params.targetUserId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orgs/switch/:orgId — switch active org
router.post('/switch/:orgId', auth, async (req, res) => {
  try {
    const membership = await OrgMember.findOne({ organizationId: req.params.orgId, userId: req.userId });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this organization' });
    await User.findByIdAndUpdate(req.userId, { currentOrgId: req.params.orgId });
    const org = await Organization.findById(req.params.orgId);
    const settings = await OrgSettings.findOne({ organizationId: req.params.orgId });
    res.json({ org: org.toJSON(), settings: settings?.toJSON(), role: membership.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
