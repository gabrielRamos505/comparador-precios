const express = require('express');
const router = express.Router();

// ✅ Verifica que la ruta relativa sea correcta (../controllers...)
const authController = require('../controllers/authController');

// ✅ Verifica que uses llaves { } porque el middleware exporta un objeto
const { authMiddleware } = require('../middleware/authMiddleware');

// Debugging (Opcional: Si sigue fallando, descomenta esto para ver qué es undefined)
// console.log('Middleware:', authMiddleware);
// console.log('Controller Verify:', authController.verifyToken);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authMiddleware, authController.verifyToken); // 👈 Aquí estaba el error
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;