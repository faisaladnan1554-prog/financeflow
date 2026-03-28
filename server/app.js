/**
 * Express app — routes mounted WITHOUT /api prefix.
 * Used by Netlify Functions (the /api/* redirect strips the prefix).
 * Local dev uses server/index.js which keeps the /api/* prefix for Vite proxy.
 */
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes (no /api prefix — Netlify redirect already stripped it)
app.use('/auth',            require('./routes/auth'));
app.use('/accounts',        require('./routes/accounts'));
app.use('/transactions',    require('./routes/transactions'));
app.use('/categories',      require('./routes/categories'));
app.use('/budgets',         require('./routes/budgets'));
app.use('/goals',           require('./routes/goals'));
app.use('/loans',           require('./routes/loans'));
app.use('/credit-cards',    require('./routes/creditCards'));
app.use('/recurring-bills', require('./routes/recurringBills'));
app.use('/split-expenses',  require('./routes/splitExpenses'));

// Health check
const mongoose = require('mongoose');
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error' });
});

module.exports = app;
