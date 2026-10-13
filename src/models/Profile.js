import mongoose from 'mongoose';
const profileSchema = new mongoose.Schema({
  name: { type: String, default: 'Ankur Verma' }, headline: { type: String, default: 'Full Stack Developer | Backend Engineering Enthusiast' },
  biography: { type: String, default: 'I am a BCA student who enjoys building modern web applications, real-time systems, and AI-powered experiences with a focus on backend engineering and scalable architecture.' },
  location: { type: String, default: 'Meerut, Uttar Pradesh, India' }, email: { type: String, default: 'ankurver413@gmail.com' },
  github: { type: String, default: 'https://github.com/ankurverma786' }, linkedin: { type: String, default: 'https://www.linkedin.com/in/ankur0003/' }, leetcode: { type: String, default: '' }, resumeUrl: { type: String, default: '' }, availability: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Profile', profileSchema);
