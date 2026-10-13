import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';
import * as dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

try {
  if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await Admin.findOneAndUpdate({email},{email,passwordHash,role:'admin'},{upsert:true,new:true,setDefaultsOnInsert:true});
  console.log(`Admin account ready: ${email}`);
} catch (e) { console.error(e.message); process.exitCode=1; }
finally { await mongoose.disconnect(); }
