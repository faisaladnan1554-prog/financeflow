const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS — allow Netlify frontend + local dev
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL, // your Netlify URL, set in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/accounts',        require('./routes/accounts'));
app.use('/api/transactions',    require('./routes/transactions'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/budgets',         require('./routes/budgets'));
app.use('/api/goals',           require('./routes/goals'));
app.use('/api/loans',           require('./routes/loans'));
app.use('/api/credit-cards',    require('./routes/creditCards'));
app.use('/api/recurring-bills', require('./routes/recurringBills'));
app.use('/api/split-expenses',  require('./routes/splitExpenses'));
app.use('/api/admin',           require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Connect to MongoDB then start listening
// Render injects PORT automatically; fallback to 5000 for local dev
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
