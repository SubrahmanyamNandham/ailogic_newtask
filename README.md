# AuthLogic — JWT Authentication API

A secure, modular Node.js + Express authentication API with PostgreSQL (Sequelize), JWT-based auth, bcrypt password hashing, and a Redis-based login rate limiter.

## Features

- **User registration** — validates required fields, hashes passwords with bcrypt, rejects duplicate emails (409)
- **User login** — verifies credentials, issues a JWT (2h expiry)
- **Protected profile route** — requires a valid `Authorization: Bearer <token>` header
- **JWT authentication** — `jsonwebtoken` with `JWT_SECRET`
- **Secure password hashing** — `bcrypt` (12 salt rounds)
- **Redis rate limiter** — max 5 login attempts per IP per 1 minute; returns `429 Too Many Requests`; TTL-based expiration; graceful degradation if Redis is down
- **PostgreSQL** via **Sequelize** ORM
- **Automated tests** — Jest + Supertest

## Project Structure

```
src/
  app.js                # Express app setup
  server.js             # Entry point; starts the server
  db.js                 # Sequelize instance (PostgreSQL)
  authcontroller.js     # register / login controllers
  authRoutes.js         # route definitions
  authmiddleware..js    # JWT auth middleware (profile protection)
  middleware/
    rateLimiter.js      # Redis login rate limiter (5 attempts/IP/min)
  auth.test.js          # Jest + Supertest test suite
.env                    # environment variables (not committed)
package.json
```

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ailogic_test
JWT_SECRET=your_super_secret_key
REDIS_URL=redis://localhost:6379
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing/verifying JWTs |
| `REDIS_URL` | No | Redis connection (rate limiter degrades gracefully if missing) |

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   Copy the `.env` example above into `.env` and update values as needed.

3. **Prepare the database**
   Ensure PostgreSQL is running and the target database exists. The `users` table should have columns:
   `id SERIAL PRIMARY KEY`, `name TEXT NOT NULL`, `email TEXT UNIQUE NOT NULL`, `password TEXT NOT NULL`.

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

   Server runs at `http://localhost:5000`; auth routes are mounted at `/api/auth`.

## API Endpoints

### `POST /api/auth/register`
Register a new user.

**Body:**
```json
{ "name": "Test User", "email": "test@example.com", "password": "Secret123" }
```

**Responses:**
- `201` — user registered successfully
- `400` — all fields are required
- `409` — email already exists
- `500` — internal server error

### `POST /api/auth/login`
Authenticate and receive a JWT. Rate-limited: max 5 attempts per IP per minute.

**Body:**
```json
{ "email": "test@example.com", "password": "Secret123" }
```

**Responses:**
- `200` — `{ token, user }`
- `400` — email and password required
- `401` — invalid email and password
- `429` — too many login attempts (rate limited)
- `500` — internal server error

### `GET /api/auth/profile`
Access the protected profile (requires a valid JWT).

**Header:** `Authorization: Bearer <token>`

**Responses:**
- `200` — `{ message: "profile access granted", userId }`
- `401` — TOKEN required
- `403` — expired token

## Rate Limiter Behavior

- Keyed by client IP: `rate_limit:login:<ip>`
- Allows **5 attempts per IP per 60-second window**
- On the 6th attempt within the window, responds `429 Too Many Requests`
- Counter resets after the TTL expires (1 minute)
- If Redis is unreachable, the limiter degrades gracefully and requests proceed unblocked

## Running Tests

```bash
npm test
```

Tests use a test database (`ailogic_test`) and cover:
- Register: valid user, missing fields, duplicate email
- Login: valid credentials, missing credentials, wrong email, wrong password
- Profile: valid token, no token, bad token
- Rate limiting: 5 attempts allowed, 6th returns 429

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL (Sequelize ORM)
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Rate limiting:** Redis
- **Testing:** Jest + Supertest
