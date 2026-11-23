const express = require('express');
const { register, login } = require('./authcontroller');
const authToken = require('./authmiddleware');
const rateLimiter = require('./middleware/rateLimiter');
const router = express.Router();
router.post('/register', register);

router.post('/login', rateLimiter, login);
router.get('/profile', authToken, (req, res) => {
    res.json({
        message: 'profile access granted',
        userId: req.user.userId,
    });
});

module.exports = router;