const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ScheduledEntry = require('../models/ScheduledEntry');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// GET /  — list all (all statuses, sorted by date asc)
router.get('/', auth, async (req, res) => {
  try {
    const entries = await ScheduledEntry.find({ userId: req.userId }).sort({ date: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /  — create
router.post('/', auth, async (req, res) => {
  try {
    const entry = new ScheduledEntry({ ...req.body, userId: req.userId, status: 'pending' });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /:id
router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await ScheduledEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body, { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const e = await ScheduledEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!e) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /apply  — auto-apply all pending entries whose date <= today
// Creates a real transaction for each and marks them applied
router.post('/apply', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const pending = await ScheduledEntry.find({
      userId: req.userId,
      status: 'pending',
      date: { $lte: today },
    });

    if (pending.length === 0) {
      return res.json({ applied: 0, transactions: [] });
    }

    const mongoose = require('mongoose');
    const userObjId = mongoose.Types.ObjectId.createFromHexString(req.userId);
    const createdTransactions = [];

    for (const entry of pending) {
      // Create transaction
      const tx = new Transaction({
        userId:      userObjId,
        organizationId: entry.organizationId,
        type:        entry.type,
        amount:      entry.amount,
        category:    entry.categoryId || (entry.type === 'income' ? 'cat_salary' : 'cat_other'),
        accountId:   entry.accountId,
        date:        entry.date,
        description: entry.title + (entry.notes ? ` — ${entry.notes}` : ''),
        notes:       entry.notes || '',
      });
      await tx.save();

      // Adjust account balance
      const delta = entry.type === 'income' ? entry.amount : -entry.amount;
      await Account.findByIdAndUpdate(entry.accountId, { $inc: { balance: delta } });

      // Mark entry as applied
      entry.status = 'applied';
      entry.transactionId = tx._id.toString();
      await entry.save();

      createdTransactions.push(tx);
    }

    res.json({ applied: createdTransactions.length, transactions: createdTransactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /:id/apply  — manually apply a single entry
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const entry = await ScheduledEntry.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (entry.status !== 'pending') return res.status(400).json({ error: 'Entry is already applied or cancelled' });

    const mongoose = require('mongoose');
    const userObjId = mongoose.Types.ObjectId.createFromHexString(req.userId);

    const tx = new Transaction({
      userId:         userObjId,
      organizationId: entry.organizationId,
      type:           entry.type,
      amount:         entry.amount,
      category:       entry.categoryId || (entry.type === 'income' ? 'cat_salary' : 'cat_other'),
      accountId:      entry.accountId,
      date:           entry.date,
      description:    entry.title + (entry.notes ? ` — ${entry.notes}` : ''),
      notes:          entry.notes || '',
    });
    await tx.save();

    const delta = entry.type === 'income' ? entry.amount : -entry.amount;
    await Account.findByIdAndUpdate(entry.accountId, { $inc: { balance: delta } });

    entry.status = 'applied';
    entry.transactionId = tx._id.toString();
    await entry.save();

    res.json({ entry, transaction: tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
