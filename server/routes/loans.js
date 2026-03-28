const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Loan = require('../models/Loan');
const { v4: uuidv4 } = require('crypto');

const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

router.get('/', auth, async (req, res) => {
  try { res.json(await Loan.find({ userId: req.userId }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const loan = new Loan({ ...req.body, userId: req.userId, remainingAmount: req.body.amount, payments: [] });
    await loan.save();
    res.status(201).json(loan);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, req.body, { new: true }
    );
    if (!loan) return res.status(404).json({ error: 'Not found' });
    res.json(loan);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const l = await Loan.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!l) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Record a payment
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.userId });
    if (!loan) return res.status(404).json({ error: 'Not found' });

    const remaining = Math.max(0, loan.remainingAmount - amount);
    loan.remainingAmount = remaining;
    if (remaining === 0) loan.status = 'settled';
    loan.payments.push({
      id: newId(),
      amount,
      date: new Date().toISOString().split('T')[0],
      notes: notes || '',
    });
    await loan.save();
    res.json(loan);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
