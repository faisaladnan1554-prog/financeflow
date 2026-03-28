const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OrgSettings = require('../models/OrgSettings');
const OrgMember = require('../models/OrgMember');

// GET /api/org-settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await OrgSettings.findOne({ organizationId: req.organizationId });
    if (!settings) {
      settings = await OrgSettings.create({ organizationId: req.organizationId });
    }
    res.json(settings.toJSON());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/org-settings — owner/admin only
router.put('/', auth, async (req, res) => {
  try {
    const membership = await OrgMember.findOne({ organizationId: req.organizationId, userId: req.userId });
    if (!['owner','admin'].includes(membership?.role)) {
      return res.status(403).json({ error: 'Only admins can change workspace settings' });
    }
    const { appName, logoUrl, primaryColor, secondaryColor, accentColor, mode, currency } = req.body;
    const update = {};
    if (appName !== undefined) update.appName = appName;
    if (logoUrl !== undefined) update.logoUrl = logoUrl;
    if (primaryColor !== undefined) update.primaryColor = primaryColor;
    if (secondaryColor !== undefined) update.secondaryColor = secondaryColor;
    if (accentColor !== undefined) update.accentColor = accentColor;
    if (mode !== undefined) update.mode = mode;
    if (currency !== undefined) update.currency = currency;

    const settings = await OrgSettings.findOneAndUpdate(
      { organizationId: req.organizationId },
      update,
      { new: true, upsert: true }
    );
    res.json(settings.toJSON());
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
