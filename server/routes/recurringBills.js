const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RecurringBill = require('../models/RecurringBill');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

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
    const paidAmount = amount || bill.amount;
    bill.payments.push({
      id: newId(),
      amount: paidAmount,
      date: new Date().toISOString().split('T')[0],
      month: month || new Date().toISOString().slice(0, 7),
    });
    await bill.save();

    // Create a Transaction document for this bill payment
    try {
      await Transaction.create({
        userId: req.userId,
        type: 'expense',
        amount: paidAmount,
        date: new Date().toISOString().split('T')[0],
        category: bill.category,
        accountId: bill.accountId,
        notes: `${bill.name} - Recurring Bill`,
      });
    } catch (txErr) {
      console.error('Failed to create transaction for bill payment:', txErr.message);
    }

    // Deduct from account balance
    if (bill.accountId) {
      try {
        await Account.findOneAndUpdate(
          { _id: bill.accountId, userId: req.userId },
          { $inc: { balance: -paidAmount } }
        );
      } catch (accErr) {
        console.error('Failed to update account balance for bill payment:', accErr.message);
      }
    }

    res.json(bill);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
