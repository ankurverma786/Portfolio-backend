# Backend setup
1. Install Node.js 20+ and MongoDB Atlas account.
2. Copy `.env.example` to `.env`, fill `MONGODB_URI`, a long random `JWT_SECRET`, and admin credentials.
3. `npm install`
4. `npm run seed-admin` (creates/updates the initial admin; never commit `.env`).
5. `npm run dev`

API base: `http://localhost:5000/api/v1`; health check: `/health`.
Cloudinary image uploads are optional until configured. The admin upload endpoint accepts JPG/PNG/WEBP up to 5 MB.
