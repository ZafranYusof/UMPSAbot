const express = require('express');
const router = express.Router();
const { getUpcoming } = require('../controllers/notificationsController');

// Get upcoming deadlines/events from knowledge base
router.get('/upcoming', getUpcoming);

module.exports = router;
