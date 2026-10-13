import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import api from './routes/api.js';
import { notFound, errorHandler } from './middleware/errors.js';

import * as dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) {
  // Allow tools/server-to-server requests without an Origin header.
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// Cache the connection promise so serverless requests reuse the MongoDB connection.
let dbPromise;
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      dbPromise ||= connectDB().catch((error) => { dbPromise = null; throw error; });
      await dbPromise;
    }
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/v1', api);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`API running at http://localhost:${port}`));
}

export default app;
