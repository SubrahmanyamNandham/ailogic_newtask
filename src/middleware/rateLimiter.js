const redis = require('redis');

let redisClient = null;
let redisReady = false;

const initRedis = async () => {
    try {
        if (!process.env.REDIS_URL) {
            redisReady = false;
            return;
        }
        redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            socket: { connectTimeout: 2000 },
        });
        redisClient.on('error', (err) => {
            redisReady = false;
        });
        await redisClient.connect();
        redisReady = true;
        console.log('Redis connected for rate limiting');
    } catch (error) {
        redisReady = false;
        redisClient = null;
        console.error('Redis unavailable — rate limiter will degrade gracefully:', error.message);
    }
};

initRedis();

const rateLimiter = async (req, res, next) => {
    // Graceful degradation: if Redis is unavailable, allow the request through
    if (!redisReady || !redisClient) {
        return next();
    }

    try {
        const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
        const key = `rate_limit:login:${ip}`;

        const count = await redisClient.incr(key);
        if (count === 1) {
            await redisClient.expire(key, 60); // TTL: 1 minute
        }

        if (count > 5) {
            return res.status(429).json({
                message: 'Too many login attempts. Please try again after 1 minute.',
            });
        }

        next();
    } catch (error) {
        // Redis failure at request time — graceful degradation, allow request
        console.error('Rate limiter request error:', error.message);
        next();
    }
};

module.exports = rateLimiter;
