const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');

router.get('/', auth, async (req, res) => {
  try {
    const cats = await Category.find({ userId: req.userId }).sort({ isDefault: -1, name: 1 });
    res.json(cats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const cat = new Category({ ...req.body, userId: req.userId, isDefault: false });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body, { new: true }
    );
    if (!cat) return res.status(404).json({ error: 'Not found' });
    res.json(cat);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, userId: req.userId });
    if (!cat) return res.status(404).json({ error: 'Not found' });
    if (cat.isDefault) return res.status(403).json({ error: 'Cannot delete default categories' });
    await cat.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
