const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SplitExpense = require('../models/SplitExpense');

router.get('/', auth, async (req, res) => {
  try { res.json(await SplitExpense.find({ userId: req.userId }).sort({ date: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const split = new SplitExpense({ ...req.body, userId: req.userId });
    await split.save();
    res.status(201).json(split);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const split = await SplitExpense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, req.body, { new: true }
    );
    if (!split) return res.status(404).json({ error: 'Not found' });
    res.json(split);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const s = await SplitExpense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark a participant as paid
router.post('/:id/participant/:participantId/pay', auth, async (req, res) => {
  try {
    const split = await SplitExpense.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Not found' });

    const participant = split.participants.find(p => p.id === req.params.participantId);
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    participant.isPaid = true;
    participant.paidDate = new Date().toISOString().split('T')[0];

    // Check if all paid
    if (split.participants.every(p => p.isPaid)) split.status = 'settled';
    await split.save();
    res.json(split);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
