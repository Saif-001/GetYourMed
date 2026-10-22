# Medicine Management Starter — Phase 1

Stack: React + Vite + Tailwind CSS, Express, MongoDB. Includes customer registration, login, logout, protected session check, and Google sign-in endpoint/UI placeholder.

## Run backend
1. Install Node.js 20+ and configure MongoDB Atlas or local MongoDB.
2. `cd backend`
3. Copy `.env.example` to `.env`, then set `MONGODB_URI` and a random `JWT_SECRET` (at least 32 characters).
4. `npm install`
5. `npm run dev`

## Run frontend in another terminal
1. `cd frontend`
2. Copy `.env.example` to `.env`
3. `npm install`
4. `npm run dev`
5. Open http://localhost:5173

Google sign-in needs a Google OAuth Web Client ID. Set it as `GOOGLE_CLIENT_ID` in backend/.env and `VITE_GOOGLE_CLIENT_ID` in frontend/.env, and authorize `http://localhost:5173` as a JavaScript origin. Until configured, the button explains that setup is pending.

Registration immediately logs the customer in, with no OTP/email verification. Public registration always assigns the customer role. This is a development starter, not production-ready; before launch add deployment-specific CSRF controls, recovery safeguards, tests, monitoring, backups, privacy controls, and legal/pharmacy compliance review.
