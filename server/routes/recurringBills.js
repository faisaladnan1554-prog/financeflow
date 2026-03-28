const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RecurringBill = require('../models/RecurringBill');

const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

router.get('/', auth, async (req, res) => {
  try { res.json(await RecurringBill.find({ userId: req.userId }).sort({ dueDay: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const bill = new RecurringBill({ ...req.body, userId: req.userId, payments: [] });
    await bill.save();
    res.status(201).json(bill);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await RecurringBill.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, req.body, { new: true }
    );
    if (!bill) return res.status(404).json({ error: 'Not found' });
    res.json(bill);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const b = await RecurringBill.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark bill as paid for current month
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount, month } = req.body;
    const bill = await RecurringBill.findOne({ _id: req.params.id, userId: req.userId });
    if (!bill) return res.status(404).json({ error: 'Not found' });
    bill.payments.push({
      id: newId(),
      amount: amount || bill.amount,
      date: new Date().toISOString().split('T')[0],
      month: month || new Date().toISOString().slice(0, 7),
    });
    await bill.save();
    res.json(bill);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
