export function notFound(req, res) { res.status(404).json({ message: 'Route not found' }); }
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'That value already exists. Please use a unique project slug.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message || 'Server error' });
}
