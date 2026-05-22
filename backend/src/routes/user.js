/**
 * User Routes
 * Handles user preferences for personalization
 */

const express = require('express');
const router = express.Router();
const UserPreference = require('../models/UserPreference');

/**
 * GET /api/user/preferences
 * Retrieve user preferences
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (query param or x-user-id header)' });
    }

    const prefs = await UserPreference.findOne({ userId }).lean();
    if (!prefs) {
      return res.json({ userId, faculty: null, programme: null, year: null, preferredLanguage: null });
    }

    res.json({
      userId: prefs.userId,
      faculty: prefs.faculty,
      programme: prefs.programme,
      year: prefs.year,
      preferredLanguage: prefs.preferredLanguage
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user/preferences
 * Save or update user preferences
 */
router.post('/preferences', async (req, res, next) => {
  try {
    const { userId, faculty, programme, year, preferredLanguage } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const update = {};
    if (faculty !== undefined) update.faculty = faculty;
    if (programme !== undefined) update.programme = programme;
    if (year !== undefined) update.year = year;
    if (preferredLanguage !== undefined) update.preferredLanguage = preferredLanguage;

    const prefs = await UserPreference.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      preferences: {
        userId: prefs.userId,
        faculty: prefs.faculty,
        programme: prefs.programme,
        year: prefs.year,
        preferredLanguage: prefs.preferredLanguage
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
