import mongoose from 'mongoose';
const schema = new mongoose.Schema({ type: { type: String, enum: ['education','project','internship','certification','achievement'], default: 'education' }, title: { type: String, required: true }, organization: { type: String, default: '' }, startDate: { type: String, default: '' }, endDate: { type: String, default: '' }, description: { type: String, default: '' }, published: { type: Boolean, default: true }, displayOrder: { type: Number, default: 0 } }, { timestamps: true });
export default mongoose.model('Experience', schema);
