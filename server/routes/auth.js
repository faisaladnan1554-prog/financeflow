const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const DEFAULT_CATEGORIES = [
  { name: 'Salary',        type: 'income',  icon: '💼', color: '#10B981', isDefault: true },
  { name: 'Freelance',     type: 'income',  icon: '💻', color: '#3B82F6', isDefault: true },
  { name: 'Business',      type: 'income',  icon: '🏢', color: '#8B5CF6', isDefault: true },
  { name: 'Investment',    type: 'income',  icon: '📈', color: '#F59E0B', isDefault: true },
  { name: 'Gift',          type: 'income',  icon: '🎁', color: '#EC4899', isDefault: true },
  { name: 'Other Income',  type: 'income',  icon: '💰', color: '#06B6D4', isDefault: true },
  { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#EF4444', isDefault: true },
  { name: 'Transport',     type: 'expense', icon: '🚗', color: '#F97316', isDefault: true },
  { name: 'Rent & Housing',type: 'expense', icon: '🏠', color: '#EAB308', isDefault: true },
  { name: 'Utilities',     type: 'expense', icon: '💡', color: '#84CC16', isDefault: true },
  { name: 'Health',        type: 'expense', icon: '🏥', color: '#14B8A6', isDefault: true },
  { name: 'Education',     type: 'expense', icon: '📚', color: '#6366F1', isDefault: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#A855F7', isDefault: true },
  { name: 'Shopping',      type: 'expense', icon: '🛍️', color: '#F43F5E', isDefault: true },
  { name: 'Travel',        type: 'expense', icon: '✈️', color: '#0EA5E9', isDefault: true },
  { name: 'Other Expense', type: 'expense', icon: '📦', color: '#6B7280', isDefault: true },
];

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const user = new User({ name, email, loginTime: new Date() });
    user.password = password; // Will be hashed by pre-save hook
    await user.save();

    // Create default categories for this user
    await Category.insertMany(DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user._id })));

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    user.loginTime = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verify token + return user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile — update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, currency, language, fiscalMonthStart } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, email, currency, language, fiscalMonthStart },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
