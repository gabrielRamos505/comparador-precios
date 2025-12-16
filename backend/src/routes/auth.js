const express = require('express');
const router = express.Router();

// Mock users database
const users = [
    {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        password: '123456', // En producción NUNCA guardes contraseñas en texto plano
    },
];

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({
            success: true,
            token: 'mock-token-' + Date.now(),
            userId: user.id,
            email: user.email,
            name: user.name,
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Credenciales incorrectas',
        });
    }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    // Verificar si ya existe
    if (users.find(u => u.email === email)) {
        return res.status(400).json({
            success: false,
            message: 'El email ya está registrado',
        });
    }

    const newUser = {
        id: (users.length + 1).toString(),
        name,
        email,
        password,
    };

    users.push(newUser);

    res.status(201).json({
        success: true,
        token: 'mock-token-' + Date.now(),
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
    });
});

module.exports = router;
