import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Admin from '../models/Admin.js';
import Project from '../models/Project.js';
import Profile from '../models/Profile.js';
import Skill from '../models/Skill.js';
import Experience from '../models/Experience.js';
import ContactMessage from '../models/ContactMessage.js';
import { requireAdmin } from '../middleware/auth.js';
import slugify from '../utils/slugify.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login attempts. Try again in 15 minutes.' } });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many messages. Please try later.' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype)) });
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const safeProject = p => ({ ...p.toObject(), __v: undefined });

router.post('/auth/login', loginLimiter, asyncRoute(async (req,res) => {
  const email = String(req.body.email || '').toLowerCase().trim(); const password = String(req.body.password || '');
  const admin = await Admin.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
  const token = jwt.sign({ sub: admin._id.toString(), role: admin.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, admin: { email: admin.email, role: admin.role }, expiresIn: 8 * 60 * 60 });
}));
router.post('/auth/logout', (req,res) => res.json({ message: 'Logged out' }));
router.get('/auth/me', requireAdmin, asyncRoute(async (req,res) => { const a = await Admin.findById(req.adminId).select('email role'); if (!a) return res.status(401).json({ message: 'Admin not found' }); res.json({ admin: a }); }));

router.get('/projects', asyncRoute(async (req,res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
  const filter = { status: 'published' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.technology) filter.technologies = req.query.technology;
  if (req.query.search) filter.$or = [{ title: { $regex: String(req.query.search).slice(0,80), $options: 'i' } }, { shortDescription: { $regex: String(req.query.search).slice(0,80), $options: 'i' } }];
  const [items,total] = await Promise.all([Project.find(filter).sort({ featured:-1, displayOrder:1, createdAt:-1 }).skip((page-1)*limit).limit(limit), Project.countDocuments(filter)]);
  res.json({ items, page, pages: Math.ceil(total/limit), total });
}));
router.get('/projects/:slug', asyncRoute(async (req,res) => { const p = await Project.findOne({ slug: req.params.slug, status: 'published' }); if (!p) return res.status(404).json({ message: 'Project not found' }); res.json(p); }));
router.get('/profile', asyncRoute(async (req,res) => { let p = await Profile.findOne(); if (!p) p = await Profile.create({}); res.json(p); }));
router.get('/skills', asyncRoute(async (req,res) => res.json(await Skill.find().sort({ category:1, displayOrder:1 }))));
router.get('/experience', asyncRoute(async (req,res) => res.json(await Experience.find({ published:true }).sort({ displayOrder:1, startDate:-1 }))));
router.get('/settings', (req,res) => res.json({ title: 'Ankur Verma — Full Stack Developer', description: 'Portfolio of Ankur Verma, full-stack developer and backend engineering enthusiast.' }));
router.post('/contact', contactLimiter, asyncRoute(async (req,res) => {
  const { name, email, subject, message, website } = req.body;
  if (website) return res.json({ message: 'Message received' });
  if (![name,email,subject,message].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ message: 'Please complete every field.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  const doc = await ContactMessage.create({ name:name.trim(), email:email.trim(), subject:subject.trim(), message:message.trim() });
  res.status(201).json({ message: 'Thanks! Your message has been sent.', id: doc._id });
}));

router.use('/admin', requireAdmin);
router.get('/admin/dashboard', asyncRoute(async (req,res) => {
  const [totalProjects,publishedProjects,draftProjects,featuredProjects,totalMessages,unreadMessages] = await Promise.all([Project.countDocuments(),Project.countDocuments({status:'published'}),Project.countDocuments({status:'draft'}),Project.countDocuments({featured:true}),ContactMessage.countDocuments(),ContactMessage.countDocuments({isRead:false})]);
  res.json({ totalProjects,publishedProjects,draftProjects,featuredProjects,totalMessages,unreadMessages });
}));
router.get('/admin/projects', asyncRoute(async (req,res) => { const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.search) filter.title = { $regex: String(req.query.search).slice(0,80), $options:'i' }; res.json(await Project.find(filter).sort({displayOrder:1,updatedAt:-1})); }));
router.post('/admin/projects', asyncRoute(async (req,res) => {
  const body = { ...req.body }; body.slug = slugify(body.slug || body.title);
  if (!body.title || !body.shortDescription || !body.slug) return res.status(400).json({message:'Title, slug and short description are required.'});
  const project = await Project.create(body); res.status(201).json(project);
}));
router.get('/admin/projects/:id', asyncRoute(async (req,res) => { const p = await Project.findById(req.params.id); if(!p) return res.status(404).json({message:'Project not found'}); res.json(p); }));
router.patch('/admin/projects/:id', asyncRoute(async (req,res) => { const body = { ...req.body }; if (body.title || body.slug) body.slug = slugify(body.slug || body.title); const p = await Project.findByIdAndUpdate(req.params.id, body, {new:true,runValidators:true}); if(!p) return res.status(404).json({message:'Project not found'}); res.json(p); }));
router.delete('/admin/projects/:id', asyncRoute(async (req,res) => { const p = await Project.findByIdAndDelete(req.params.id); if(!p) return res.status(404).json({message:'Project not found'}); res.json({message:'Project deleted'}); }));
router.patch('/admin/projects/:id/publish', asyncRoute(async (req,res) => { const p = await Project.findByIdAndUpdate(req.params.id,{status:req.body.status === 'published' ? 'published':'draft'},{new:true,runValidators:true}); if(!p) return res.status(404).json({message:'Project not found'}); res.json(p); }));
router.get('/admin/messages', asyncRoute(async (req,res) => res.json(await ContactMessage.find().sort({createdAt:-1}).limit(200))));
router.patch('/admin/messages/:id/read', asyncRoute(async (req,res) => { const m = await ContactMessage.findByIdAndUpdate(req.params.id,{isRead:Boolean(req.body.isRead)},{new:true}); if(!m) return res.status(404).json({message:'Message not found'}); res.json(m); }));
router.delete('/admin/messages/:id', asyncRoute(async (req,res) => { const m = await ContactMessage.findByIdAndDelete(req.params.id); if(!m) return res.status(404).json({message:'Message not found'}); res.json({message:'Message deleted'}); }));
router.patch('/admin/profile', asyncRoute(async (req,res) => { const p = await Profile.findOneAndUpdate({}, req.body, {new:true,upsert:true,runValidators:true,setDefaultsOnInsert:true}); res.json(p); }));
router.post('/admin/skills', asyncRoute(async (req,res) => res.status(201).json(await Skill.create(req.body))));
router.patch('/admin/skills/:id', asyncRoute(async (req,res) => { const s=await Skill.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true}); if(!s)return res.status(404).json({message:'Skill not found'});res.json(s); }));
router.delete('/admin/skills/:id', asyncRoute(async (req,res) => { const s=await Skill.findByIdAndDelete(req.params.id); if(!s)return res.status(404).json({message:'Skill not found'});res.json({message:'Skill deleted'}); }));
router.post('/admin/experience', asyncRoute(async (req,res) => res.status(201).json(await Experience.create(req.body))));
router.patch('/admin/experience/:id', asyncRoute(async (req,res) => { const e=await Experience.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true}); if(!e)return res.status(404).json({message:'Entry not found'});res.json(e); }));
router.delete('/admin/experience/:id', asyncRoute(async (req,res) => { const e=await Experience.findByIdAndDelete(req.params.id); if(!e)return res.status(404).json({message:'Entry not found'});res.json({message:'Entry deleted'}); }));
router.post('/admin/uploads', upload.single('image'), asyncRoute(async (req,res) => {
  if (!req.file) return res.status(400).json({message:'Choose a JPG, PNG or WEBP image under 5 MB.'});
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return res.status(503).json({message:'Cloudinary is not configured. Add credentials to backend/.env.'});
  const result = await new Promise((resolve,reject) => { const stream = cloudinary.uploader.upload_stream({folder:'ankur-portfolio'},(err,out)=>err?reject(err):resolve(out)); stream.end(req.file.buffer); });
  res.status(201).json({url:result.secure_url,publicId:result.public_id});
}));
export default router;
