const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// ── Build prompts ───────────────────────────────────────────────────────────
function buildPrompts(financialData) {
  const { income, expenses, savings, transactions, goals, currency, currentMonth } = financialData;

  const systemPrompt = `You are an expert financial advisor AI. Analyze the user's financial data and return ONLY a valid JSON object (no markdown, no extra text) with exactly this structure:
{
  "healthScore": <number 0-100>,
  "healthLabel": <"Critical"|"Warning"|"Good"|"Excellent">,
  "healthColor": <"red"|"orange"|"yellow"|"green"|"purple">,
  "bankruptcyRisk": <"low"|"medium"|"high"|"critical">,
  "bankruptcyRiskLabel": <string>,
  "savingsRate": <number, percentage>,
  "monthsToFreedom": <number>,
  "freedomDate": <"YYYY-MM" string>,
  "monthlyTarget": <number>,
  "motivationalMessage": <string>,
  "summary": <string>,
  "budgetRecommendations": [{ "category": <string>, "current": <number>, "recommended": <number>, "action": <string> }],
  "actionItems": [{ "priority": <"high"|"medium"|"low">, "title": <string>, "description": <string>, "impact": <string> }],
  "projections": [{ "month": <"YYYY-MM">, "income": <number>, "expenses": <number>, "savings": <number>, "cumulative": <number> }]
}
Projections should cover 12 months starting from the current month. All monetary values in ${currency || 'PKR'}.`;

  const expenseBreakdown = Object.entries(expenses || {})
    .map(([cat, amt]) => `  - ${cat}: ${amt}`)
    .join('\n');

  const userPrompt = `Current Month: ${currentMonth || new Date().toISOString().slice(0, 7)}
Monthly Income: ${income || 0} ${currency || 'PKR'}
Monthly Expenses by Category (last 3 months avg):
${expenseBreakdown || '  No expense data'}
Total Savings/Net Worth: ${savings || 0} ${currency || 'PKR'}
Financial Goals: ${goals || 'Not specified'}
Recent transaction count: ${transactions || 0}

Please analyze this data and provide a comprehensive financial strategy as JSON.`;

  return { systemPrompt, userPrompt };
}

// ── Call OpenAI ─────────────────────────────────────────────────────────────
async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');
  return JSON.parse(data.choices[0].message.content);
}

// ── Call Anthropic ──────────────────────────────────────────────────────────
async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic API error');
  const text = data.content[0].text;
  // Extract JSON from possible markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1].trim());
}

// ── POST /api/ai/strategy ───────────────────────────────────────────────────
router.post('/strategy', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const apiKey = user.aiApiKey;
    if (!apiKey) return res.status(400).json({ error: 'AI API key not configured. Please add your API key in Settings.' });

    const { financialData } = req.body;
    if (!financialData) return res.status(400).json({ error: 'financialData is required' });

    const { systemPrompt, userPrompt } = buildPrompts(financialData);

    let result;
    if (user.aiProvider === 'anthropic') {
      result = await callAnthropic(apiKey, systemPrompt, userPrompt);
    } else {
      result = await callOpenAI(apiKey, systemPrompt, userPrompt);
    }

    res.json(result);
  } catch (err) {
    console.error('AI strategy error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate AI strategy' });
  }
});

// ── GET /api/ai/settings ────────────────────────────────────────────────────
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      aiProvider: user.aiProvider || 'openai',
      hasApiKey: !!(user.aiApiKey && user.aiApiKey.length > 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/ai/settings ────────────────────────────────────────────────────
router.put('/settings', auth, async (req, res) => {
  try {
    const { aiApiKey, aiProvider } = req.body;
    const update = {};
    if (aiApiKey !== undefined) update.aiApiKey = aiApiKey;
    if (aiProvider !== undefined) update.aiProvider = aiProvider;

    await User.findByIdAndUpdate(req.userId, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
