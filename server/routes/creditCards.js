const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CreditCard = require('../models/CreditCard');

router.get('/', auth, async (req, res) => {
  try { res.json(await CreditCard.find({ userId: req.userId }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const card = new CreditCard({ ...req.body, userId: req.userId });
    await card.save();
    res.status(201).json(card);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const card = await CreditCard.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, req.body, { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Not found' });
    res.json(card);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const c = await CreditCard.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
