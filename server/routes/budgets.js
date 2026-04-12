const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

router.get('/', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId }).sort({ month: -1 });
    res.json(budgets);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { categoryId, month } = req.body;
    // Calculate current spent
    const result = await Transaction.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId), type: 'expense', category: categoryId, date: { $regex: `^${month}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const spent = result[0]?.total || 0;
    const budget = new Budget({ ...req.body, userId: req.userId, spent });
    await budget.save();
    res.status(201).json(budget);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body, { new: true }
    );
    if (!budget) return res.status(404).json({ error: 'Not found' });
    res.json(budget);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const b = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-rollover recurring budgets into the given month
router.post('/rollover', auth, async (req, res) => {
  try {
    const { month } = req.body; // e.g. "2026-03"
    if (!month) return res.status(400).json({ error: 'month is required' });

    // Find all recurring budgets for this user (any month)
    const recurringBudgets = await Budget.find({ userId: req.userId, recurring: true });

    // Find which categoryIds already have a budget for the target month
    const existing = await Budget.find({ userId: req.userId, month });
    const existingCatIds = new Set(existing.map(b => b.categoryId));

    const created = [];
    for (const b of recurringBudgets) {
      if (existingCatIds.has(b.categoryId)) continue; // already exists for this month

      // Calculate spent for this category in the target month
      const result = await Transaction.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId),
            type: 'expense',
            category: b.categoryId,
            date: { $regex: `^${month}` },
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = result[0]?.total || 0;

      const newBudget = new Budget({
        userId: req.userId,
        categoryId: b.categoryId,
        monthlyLimit: b.monthlyLimit,
        alertThreshold: b.alertThreshold,
        recurring: true,
        month,
        spent,
      });
      await newBudget.save();
      created.push(newBudget);
    }

    res.json({ created: created.length, budgets: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
