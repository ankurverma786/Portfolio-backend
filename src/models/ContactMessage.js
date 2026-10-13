import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name: { type: String, required: true, maxlength: 80 }, email: { type: String, required: true, maxlength: 160 }, subject: { type: String, required: true, maxlength: 160 }, message: { type: String, required: true, maxlength: 3000 }, isRead: { type: Boolean, default: false } }, { timestamps: true });
export default mongoose.model('ContactMessage', schema);
