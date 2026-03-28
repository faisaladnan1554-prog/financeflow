const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const User = require('../models/User');

// ── Environment config ──────────────────────────────────────────────────────
const JAZZCASH_MERCHANT_ID  = process.env.JAZZCASH_MERCHANT_ID  || 'TEST_MERCHANT';
const JAZZCASH_PASSWORD      = process.env.JAZZCASH_PASSWORD      || 'TEST_PASSWORD';
const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || 'TEST_SALT';
const JAZZCASH_RETURN_URL    = process.env.JAZZCASH_RETURN_URL    || 'http://localhost:5173/pricing?status=success';
const JAZZCASH_POST_URL      = process.env.JAZZCASH_POST_URL      || 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';

const EASYPAISA_STORE_ID     = process.env.EASYPAISA_STORE_ID     || 'TEST_STORE';
const EASYPAISA_HASH_KEY     = process.env.EASYPAISA_HASH_KEY     || 'TEST_HASH_KEY';

const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY      || '';
const PAYPAL_CLIENT_ID       = process.env.PAYPAL_CLIENT_ID       || '';
const PAYPAL_CLIENT_SECRET   = process.env.PAYPAL_CLIENT_SECRET   || '';

// In-memory payment history (per user, keyed by userId string)
const paymentHistory = {};

function addPaymentRecord(userId, record) {
  if (!paymentHistory[userId]) paymentHistory[userId] = [];
  paymentHistory[userId].unshift(record);
  // Keep only last 50 records
  if (paymentHistory[userId].length > 50) paymentHistory[userId].length = 50;
}

// ── JazzCash HMAC ───────────────────────────────────────────────────────────
function generateJazzCashHash(params, integritySalt) {
  // Sort keys alphabetically, build hash string: salt&key=value&key=value...
  const sortedKeys = Object.keys(params).sort();
  const hashString = integritySalt + '&' + sortedKeys.map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHmac('sha256', integritySalt).update(hashString).digest('hex');
}

// ── POST /api/payments/stripe/checkout ─────────────────────────────────────
router.post('/stripe/checkout', auth, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount) return res.status(400).json({ error: 'planId and amount are required' });

    // Without actual Stripe SDK — return structured checkout data
    const sessionId = `stripe_session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    res.json({
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      sessionId,
      note: 'Configure STRIPE_SECRET_KEY environment variable for live payments',
      planId,
      amount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/jazzcash ─────────────────────────────────────────────
router.post('/jazzcash', auth, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount) return res.status(400).json({ error: 'planId and amount are required' });

    const now = new Date();
    const txnDateTime     = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const txnExpiry       = new Date(now.getTime() + 30 * 60 * 1000).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const txnRefNo        = `T${txnDateTime}`;
    const amountInPaisa   = Math.round(amount * 100).toString().padStart(10, '0'); // JazzCash uses paisa

    const params = {
      pp_Amount:             amount.toString(),
      pp_BillReference:      `financeflow_${planId}`,
      pp_Description:        `FinanceFlow ${planId} Plan`,
      pp_Language:           'EN',
      pp_MerchantID:         JAZZCASH_MERCHANT_ID,
      pp_Password:           JAZZCASH_PASSWORD,
      pp_ReturnURL:          JAZZCASH_RETURN_URL,
      pp_TxnCurrency:        'PKR',
      pp_TxnDateTime:        txnDateTime,
      pp_TxnExpiryDateTime:  txnExpiry,
      pp_TxnRefNo:           txnRefNo,
      ppmpf_1:               '1',
    };

    params.pp_SecureHash = generateJazzCashHash(params, JAZZCASH_INTEGRITY_SALT);

    res.json({
      postUrl: JAZZCASH_POST_URL,
      params,
      planId,
      amount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/easypaisa ────────────────────────────────────────────
router.post('/easypaisa', auth, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount) return res.status(400).json({ error: 'planId and amount are required' });

    const orderId = `EP_${Date.now()}`;
    const hashString = `amount=${amount}&orderRefNum=${orderId}&storeId=${EASYPAISA_STORE_ID}&expiryDate=${new Date(Date.now() + 3600000).toISOString().slice(0, 19)}&postBackURL=${encodeURIComponent('http://localhost:5173/pricing?status=success')}&autoRedirect=0&paymentMethod=MA_PAYMENT`;
    const hash = crypto.createHmac('sha256', EASYPAISA_HASH_KEY).update(hashString).digest('hex');

    const params = {
      storeId: EASYPAISA_STORE_ID,
      amount: amount.toString(),
      postBackURL: 'http://localhost:5173/pricing?status=success',
      orderRefNum: orderId,
      expiryDate: new Date(Date.now() + 3600000).toISOString().slice(0, 19),
      autoRedirect: '0',
      paymentMethod: 'MA_PAYMENT',
      token: hash,
    };

    res.json({
      redirectUrl: 'https://easypaisa.com.pk/easypay/',
      params,
      planId,
      amount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/paypal/create-order ──────────────────────────────────
router.post('/paypal/create-order', auth, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount) return res.status(400).json({ error: 'planId and amount are required' });

    const orderId = `PAYPAL_ORDER_${Date.now()}`;
    res.json({
      orderId,
      approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
      note: 'Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for live payments',
      planId,
      amount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/manual ────────────────────────────────────────────────
router.post('/manual', auth, async (req, res) => {
  try {
    const { planId, transactionRef, method } = req.body;
    if (!planId || !transactionRef) return res.status(400).json({ error: 'planId and transactionRef are required' });

    const PLANS = { free: 0, basic: 499, pro: 1499, enterprise: 0 };
    const amount = PLANS[planId] || 0;

    const planExpiry = new Date();
    planExpiry.setDate(planExpiry.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { plan: planId, planExpiry: planId === 'free' ? null : planExpiry },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Record payment
    addPaymentRecord(req.userId.toString(), {
      date: new Date().toISOString(),
      amount,
      plan: planId,
      method: method || 'bank_transfer',
      ref: transactionRef,
    });

    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/history ────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const history = paymentHistory[req.userId.toString()] || [];
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
