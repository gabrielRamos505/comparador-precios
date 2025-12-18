const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

class AuthController {

    // REGISTRO
    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });

            const emailLower = email.toLowerCase().trim();
            const existingUser = await User.findOne({ where: { email: emailLower } });

            if (existingUser) return res.status(400).json({ success: false, error: 'Email ya registrado' });

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name: name.trim(),
                email: emailLower,
                password: hashedPassword,
            });

            const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

            console.log(`✅ User registered: ${emailLower}`);
            res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ success: false, error: 'Error al registrar usuario' });
        }
    }

    // LOGIN
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });

            const emailLower = email.toLowerCase().trim();
            const user = await User.findOne({ where: { email: emailLower } });

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            }

            const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

            console.log(`✅ User logged in: ${emailLower}`);
            res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
        }
    }

    // ✅ ESTA ES LA FUNCIÓN QUE TE FALTABA O ESTABA FALLANDO
    async verifyToken(req, res) {
        try {
            const user = await User.findByPk(req.user.userId, {
                attributes: ['id', 'name', 'email', 'created_at'],
            });

            if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

            res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
        } catch (error) {
            console.error('Verify Token error:', error);
            res.status(500).json({ success: false, error: 'Token inválido' });
        }
    }

    // OBTENER PERFIL
    async getProfile(req, res) {
        try {
            const user = await User.findByPk(req.user.userId, { attributes: ['id', 'name', 'email'] });
            if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ACTUALIZAR PERFIL
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { name, email } = req.body;
            const user = await User.findByPk(userId);

            if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

            if (name) user.name = name.trim();
            if (email) {
                const emailLower = email.toLowerCase().trim();
                const existing = await User.findOne({ where: { email: emailLower, id: { [Op.ne]: userId } } });
                if (existing) return res.status(400).json({ success: false, error: 'Email en uso' });
                user.email = emailLower;
            }

            await user.save();
            res.json({ success: true, message: 'Perfil actualizado', data: { id: user.id, name: user.name, email: user.email } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // LOGOUT
    async logout(req, res) {
        res.json({ success: true, message: 'Logout exitoso' });
    }
}

module.exports = new AuthController();