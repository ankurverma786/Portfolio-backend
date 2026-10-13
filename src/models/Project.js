import mongoose from 'mongoose';
const imageSchema = new mongoose.Schema({ url: String, publicId: String }, { _id: false });
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  shortDescription: { type: String, required: true, maxlength: 240 }, description: { type: String, default: '' },
  category: { type: String, default: 'Full Stack' }, technologies: [{ type: String, trim: true }], features: [{ type: String, trim: true }],
  coverImage: { type: imageSchema, default: () => ({ url: '', publicId: '' }) }, screenshots: [imageSchema],
  repositoryUrl: { type: String, default: '' }, liveDemoUrl: { type: String, default: '' }, caseStudyUrl: { type: String, default: '' },
  featured: { type: Boolean, default: false }, status: { type: String, enum: ['draft', 'published'], default: 'draft' }, displayOrder: { type: Number, default: 0 }
}, { timestamps: true });
projectSchema.index({ status: 1, featured: -1, displayOrder: 1, createdAt: -1 });
export default mongoose.model('Project', projectSchema);
