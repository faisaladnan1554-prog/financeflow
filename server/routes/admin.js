const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Category = require('../models/Category');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Loan = require('../models/Loan');
const CreditCard = require('../models/CreditCard');
const RecurringBill = require('../models/RecurringBill');
const SplitExpense = require('../models/SplitExpense');
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

// All routes require login
router.use(auth);

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — create new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, currency = 'PKR' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const user = new User({ name, email, currency, loginTime: new Date() });
    user.password = password;
    await user.save();

    // Create default categories for this new user
    await Category.insertMany(DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user._id })));

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id — update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, currency, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (currency) update.currency = currency;

    // If changing email, check it's not taken by another user
    if (email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
      if (exists) return res.status(409).json({ error: 'Email already in use by another account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, update);

    // Hash new password if provided
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      user.password = password; // pre-save hook will hash it
    }

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete user + ALL their data
router.delete('/users/:id', async (req, res) => {
  try {
    const targetId = req.params.id;

    // Prevent deleting yourself
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account from here. Use Settings > Danger Zone.' });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete all data belonging to this user
    await Promise.all([
      Account.deleteMany({ userId: targetId }),
      Transaction.deleteMany({ userId: targetId }),
      Category.deleteMany({ userId: targetId }),
      Budget.deleteMany({ userId: targetId }),
      SavingsGoal.deleteMany({ userId: targetId }),
      Loan.deleteMany({ userId: targetId }),
      CreditCard.deleteMany({ userId: targetId }),
      RecurringBill.deleteMany({ userId: targetId }),
      SplitExpense.deleteMany({ userId: targetId }),
    ]);

    await User.findByIdAndDelete(targetId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/data/clear — clear current user's data (keep account)
router.delete('/data/clear', async (req, res) => {
  try {
    const uid = req.userId;
    await Promise.all([
      Account.deleteMany({ userId: uid }),
      Transaction.deleteMany({ userId: uid }),
      Category.deleteMany({ userId: uid }),
      Budget.deleteMany({ userId: uid }),
      SavingsGoal.deleteMany({ userId: uid }),
      Loan.deleteMany({ userId: uid }),
      CreditCard.deleteMany({ userId: uid }),
      RecurringBill.deleteMany({ userId: uid }),
      SplitExpense.deleteMany({ userId: uid }),
    ]);
    // Re-create default categories
    await Category.insertMany(DEFAULT_CATEGORIES.map(c => ({ ...c, userId: uid })));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
