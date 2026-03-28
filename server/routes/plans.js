const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'PKR',
    period: 'month',
    features: ['3 Accounts', '100 Transactions/month', 'Basic Reports', 'Basic Modules'],
    limits: { accounts: 3, transactionsPerMonth: 100, aiAccess: false },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    currency: 'PKR',
    period: 'month',
    features: ['10 Accounts', '1,000 Transactions/month', 'All Modules', 'Advanced Reports', 'CSV Export'],
    limits: { accounts: 10, transactionsPerMonth: 1000, aiAccess: false },
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1499,
    currency: 'PKR',
    period: 'month',
    features: ['Unlimited Accounts', 'Unlimited Transactions', 'All Modules', 'AI Financial Advisor', 'Priority Support', 'Custom Categories'],
    limits: { accounts: -1, transactionsPerMonth: -1, aiAccess: true },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: -1,
    currency: 'PKR',
    period: 'month',
    features: ['Everything in Pro', 'Multi-user', 'Custom Integrations', 'Dedicated Support', 'SLA Guarantee'],
    limits: { accounts: -1, transactionsPerMonth: -1, aiAccess: true },
  }
];

// GET /api/plans
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      plans: PLANS,
      currentPlan: user.plan || 'free',
      planExpiry: user.planExpiry ? user.planExpiry.toISOString() : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plans/upgrade
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { planId, paymentMethod, transactionRef } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const planExpiry = new Date();
    planExpiry.setDate(planExpiry.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        plan: planId,
        planExpiry: planId === 'free' ? null : planExpiry,
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
