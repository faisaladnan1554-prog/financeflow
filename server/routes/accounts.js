const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json(accounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const account = new Account({ ...req.body, userId: req.userId });
    await account.save();
    res.status(201).json(account);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body, { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json(account);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST transfer between accounts
router.post('/transfer', auth, async (req, res) => {
  try {
    const { fromId, toId, amount, note } = req.body;
    if (!fromId || !toId || !amount) return res.status(400).json({ error: 'Missing fields' });

    const from = await Account.findOne({ _id: fromId, userId: req.userId });
    if (!from) return res.status(404).json({ error: 'Source account not found' });
    if (from.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct from source
    from.balance -= amount;
    await from.save();

    // Add to destination
    await Account.findOneAndUpdate(
      { _id: toId, userId: req.userId },
      { $inc: { balance: amount } }
    );

    // Record transaction
    const today = new Date().toISOString().split('T')[0];
    const tx = new Transaction({
      userId: req.userId, type: 'transfer', amount, date: today,
      category: 'cat_other_expense', accountId: fromId, toAccountId: toId,
      notes: note || 'Transfer',
    });
    await tx.save();

    // Return updated accounts
    const accounts = await Account.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json({ accounts, transaction: tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
