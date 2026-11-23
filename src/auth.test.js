require('dotenv').config();
const request = require('supertest');
const app = require('./app');
const sequelize = require('./db');

const BASE = '/api/auth';

const truncateUsers = async () => {
    await sequelize.query('TRUNCATE users RESTART IDENTITY CASCADE');
};

beforeAll(async () => {
    await truncateUsers();
});

afterEach(async () => {
    await truncateUsers();
});

afterAll(async () => {
    await truncateUsers();
    await sequelize.close();
});

describe('POST /api/auth/register', () => {
    it('R1: registers a valid user and returns 201', async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Test User', email: 'test@example.com', password: 'Secret123' });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('USER REGISTERED SUCCESSFULLY');
        expect(res.body.user).toMatchObject({
            email: 'test@example.com',
            name: 'Test User',
        });
        expect(res.body.user.id).toBeDefined();
    });

    it('R2: returns 400 when a required field is missing', async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Test User', email: 'test@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('all fields are required');
    });

    it('R3: returns 409 when email already exists', async () => {
        await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Test User', email: 'dup@example.com', password: 'Secret123' });
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Test User', email: 'dup@example.com', password: 'Secret123' });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe('email already exists');
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Test User', email: 'login@example.com', password: 'Secret123' });
    });

    it('L1: logs in with valid credentials and returns 200 + token', async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: 'login@example.com', password: 'Secret123' });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('LOGIN SUCCESSFUL');
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('login@example.com');
    });

    it('L2: returns 400 when credentials are missing', async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: 'login@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('email and password required');
    });

    it('L3: returns 401 for wrong email', async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: 'nonexistent@example.com', password: 'Secret123' });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('invalid email and password');
    });

    it('L4: returns 401 for wrong password', async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: 'login@example.com', password: 'WrongPassword' });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('invalid email or password');
    });
});

describe('GET /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
        await request(app)
            .post(`${BASE}/register`)
            .send({ name: 'Profile User', email: 'profile@example.com', password: 'Secret123' });
        const loginRes = await request(app)
            .post(`${BASE}/login`)
            .send({ email: 'profile@example.com', password: 'Secret123' });
        token = loginRes.body.token;
    });

    it('P1: returns 200 with valid token', async () => {
        const res = await request(app)
            .get(`${BASE}/profile`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('profile access granted');
        expect(res.body.userId).toBeDefined();
    });

    it('P2: returns 401 without token', async () => {
        const res = await request(app).get(`${BASE}/profile`);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('TOKEN required');
    });

    it('P3: returns 403 with a bad token', async () => {
        const res = await request(app)
            .get(`${BASE}/profile`)
            .set('Authorization', 'Bearer garbage');
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('expired token');
    });
});

describe('Login rate limiter', () => {
    // Redis may not be available in all environments; the limiter degrades
    // gracefully (allows requests through) when Redis is down.
    let redisAvailable = false;
    beforeAll(async () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl || redisUrl.trim() === '') {
            return;
        }
        try {
            const redis = require('redis');
            const c = redis.createClient({ url: redisUrl, socket: { connectTimeout: 2000 } });
            c.on('error', () => {});
            await c.connect();
            redisAvailable = true;
            await c.disconnect();
        } catch (e) {
            redisAvailable = false;
        }
    });

    it('allows 5 attempts then returns 429 on the 6th', async () => {
        if (!redisAvailable) {
            // Redis not available — rate limiter degrades gracefully
            return;
        }
        const credentials = { email: 'ratelimit@example.com', password: 'wrong' };
        // 5 failed attempts should be allowed (401 each)
        for (let i = 0; i < 5; i++) {
            const res = await request(app).post(`${BASE}/login`).send(credentials);
            expect(res.status).toBe(401);
        }
        // 6th attempt should be rate-limited (429)
        const res = await request(app).post(`${BASE}/login`).send(credentials);
        expect(res.status).toBe(429);
        expect(res.body.message).toContain('Too many login attempts');
    });
});
