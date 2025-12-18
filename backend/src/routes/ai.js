const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Solo identifica qué es, pero no busca precios en tiendas (útil para debugging)
router.post('/identify-only', optionalAuth, aiController.identifyAndSearch);

module.exports = router;