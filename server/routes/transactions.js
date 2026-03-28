const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');

// Helper: adjust account balance
async function adjustBalance(userId, accountId, delta) {
  await Account.findOneAndUpdate(
    { _id: accountId, userId },
    { $inc: { balance: delta } }
  );
}

// Helper: sync budget spent for a category/month
async function syncBudget(userId, categoryId, month) {
  const spent = await Transaction.aggregate([
    { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), type: 'expense', category: categoryId, date: { $regex: `^${month}` } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const total = spent[0]?.total || 0;
  await Budget.findOneAndUpdate(
    { userId, categoryId, month },
    { spent: total }
  );
}

// GET all transactions
router.get('/', auth, async (req, res) => {
  try {
    const txs = await Transaction.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 });
    res.json(txs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create transaction
router.post('/', auth, async (req, res) => {
  try {
    const tx = new Transaction({ ...req.body, userId: req.userId });
    await tx.save();

    // Adjust account balance
    if (tx.type === 'income') await adjustBalance(req.userId, tx.accountId, tx.amount);
    else if (tx.type === 'expense') await adjustBalance(req.userId, tx.accountId, -tx.amount);

    // Sync budget spent
    const month = tx.date.slice(0, 7);
    if (tx.type === 'expense') await syncBudget(req.userId, tx.category, month);

    res.status(201).json(tx);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update transaction
router.put('/:id', auth, async (req, res) => {
  try {
    const old = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!old) return res.status(404).json({ error: 'Not found' });

    // Reverse old balance effect
    if (old.type === 'income') await adjustBalance(req.userId, old.accountId, -old.amount);
    else if (old.type === 'expense') await adjustBalance(req.userId, old.accountId, old.amount);

    // Apply update
    Object.assign(old, req.body);
    await old.save();

    // Apply new balance effect
    if (old.type === 'income') await adjustBalance(req.userId, old.accountId, old.amount);
    else if (old.type === 'expense') await adjustBalance(req.userId, old.accountId, -old.amount);

    // Sync budgets for old and new month/category
    await syncBudget(req.userId, old.category, old.date.slice(0, 7));

    res.json(old);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!tx) return res.status(404).json({ error: 'Not found' });

    // Reverse balance
    if (tx.type === 'income') await adjustBalance(req.userId, tx.accountId, -tx.amount);
    else if (tx.type === 'expense') await adjustBalance(req.userId, tx.accountId, tx.amount);

    // Sync budget
    if (tx.type === 'expense') await syncBudget(req.userId, tx.category, tx.date.slice(0, 7));

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST bulk import
router.post('/import', auth, async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) return res.status(400).json({ error: 'transactions array required' });

    const docs = transactions.map(t => ({ ...t, userId: req.userId }));
    const saved = await Transaction.insertMany(docs);

    // Adjust balances for each
    for (const tx of saved) {
      if (tx.type === 'income') await adjustBalance(req.userId, tx.accountId, tx.amount);
      else if (tx.type === 'expense') await adjustBalance(req.userId, tx.accountId, -tx.amount);
    }

    res.status(201).json({ count: saved.length, transactions: saved });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
