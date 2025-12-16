const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/identify - Identificar producto por foto
router.post('/identify', aiController.identifyAndSearch);

module.exports = router;
