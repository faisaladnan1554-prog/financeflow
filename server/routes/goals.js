const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SavingsGoal = require('../models/SavingsGoal');

router.get('/', auth, async (req, res) => {
  try { res.json(await SavingsGoal.find({ userId: req.userId }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const goal = new SavingsGoal({ ...req.body, userId: req.userId });
    await goal.save();
    res.status(201).json(goal);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, req.body, { new: true }
    );
    if (!goal) return res.status(404).json({ error: 'Not found' });
    res.json(goal);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const g = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
