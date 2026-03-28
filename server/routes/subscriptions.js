const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');

const PLAN_PRICES = { free: 0, basic: 499, pro: 1499, enterprise: -1 };

// GET /api/subscriptions — current org subscription
router.get('/', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.organizationId }).sort({ createdAt: -1 });
    const org = await Organization.findById(req.organizationId);
    res.json({ subscription: sub?.toJSON() ?? null, currentPlan: org?.plan ?? 'free', planExpiry: org?.planExpiry ?? null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions/history
router.get('/history', auth, async (req, res) => {
  try {
    const subs = await Subscription.find({ organizationId: req.organizationId }).sort({ createdAt: -1 });
    res.json(subs.map(s => s.toJSON()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscriptions/upgrade — owner only
router.post('/upgrade', auth, async (req, res) => {
  try {
    const membership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.userId });
    if (membership?.role !== 'owner') return res.status(403).json({ error: 'Only the owner can upgrade the plan' });

    const { planId, paymentMethod = 'manual', transactionRef = '' } = req.body;
    const validPlans = ['free','basic','pro','enterprise'];
    if (!validPlans.includes(planId)) return res.status(400).json({ error: 'Invalid plan' });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Record subscription
    await Subscription.create({
      organizationId: req.organizationId,
      planId,
      status: 'active',
      startDate: new Date(),
      endDate,
      paymentMethod,
      transactionRef,
      amount: PLAN_PRICES[planId] ?? 0,
    });

    // Update org plan
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { plan: planId, planExpiry: endDate },
      { new: true }
    );

    res.json({ success: true, plan: planId, planExpiry: endDate.toISOString(), org: org.toJSON() });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
