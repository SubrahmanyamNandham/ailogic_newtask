const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db');
const { QueryTypes } = require('sequelize');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'all fields are required' });
        }

        const existingUser = await sequelize.query(
            'SELECT id FROM users WHERE email = $1',
            { bind: [email], type: QueryTypes.SELECT }
        );
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await sequelize.query(
            `INSERT INTO users(name, email, password)
             VALUES($1, $2, $3)
             RETURNING id, name, email`,
            { bind: [name, email, hashedPassword], type: QueryTypes.INSERT }
        );
        // Sequelize returns [rows] for INSERT with RETURNING; take the first row
        const user = Array.isArray(result[0]) ? result[0][0] : result[0];

        res.status(201).json({
            message: 'USER REGISTERED SUCCESSFULLY',
            user,
        });
    } catch (error) {
        res.status(500).json({ message: 'internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email and password required' });
        }

        const result = await sequelize.query(
            'SELECT id, name, email, password FROM users WHERE email = $1',
            { bind: [email], type: QueryTypes.SELECT }
        );
        if (result.length === 0) {
            return res.status(401).json({ message: 'invalid email and password' });
        }

        const user = result[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.status(200).json({
            message: 'LOGIN SUCCESSFUL',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'internal server error' });
    }
};

module.exports = { register, login };