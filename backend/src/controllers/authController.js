const { User } = require('../models');
const bcrypt = require('bcryptjs');

class AuthController {
    async register(req, res) {
        try {
            const { name, email, password } = req.body;

            // Validar campos
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, email and password are required',
                });
            }

            // Verificar si el email ya existe
            const existingUser = await User.findOne({ where: { email } });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered',
                });
            }

            // Hashear password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Crear usuario
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
            });

            // Generar token (mock por ahora)
            const token = `token-${user.id}-${Date.now()}`;

            res.status(201).json({
                success: true,
                token: token,
                userId: user.id,
                email: user.email,
                name: user.name,
            });
        } catch (error) {
            console.error('Error in register:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create user',
                details: error.message,
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validar campos
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required',
                });
            }

            // Buscar usuario
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            // Verificar password
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            // Generar token (mock por ahora)
            const token = `token-${user.id}-${Date.now()}`;

            res.json({
                success: true,
                token: token,
                userId: user.id,
                email: user.email,
                name: user.name,
            });
        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to login',
                details: error.message,
            });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.query.userId;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
            }

            const user = await User.findByPk(userId, {
                attributes: ['id', 'name', 'email', 'created_at'],
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            console.error('Error in getProfile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get profile',
                details: error.message,
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.query.userId;
            const { name, email } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
            }

            const user = await User.findByPk(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            // Actualizar campos
            if (name) user.name = name;
            if (email) {
                // Verificar que el email no esté en uso por otro usuario
                const existingUser = await User.findOne({
                    where: { email, id: { [require('sequelize').Op.ne]: userId } },
                });

                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        error: 'Email already in use',
                    });
                }
                user.email = email;
            }

            await user.save();

            res.json({
                success: true,
                message: 'Profile updated',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            });
        } catch (error) {
            console.error('Error in updateProfile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile',
                details: error.message,
            });
        }
    }
}

module.exports = new AuthController();
