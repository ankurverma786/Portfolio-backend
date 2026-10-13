import jwt from 'jsonwebtoken';

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin' || !payload.sub) {
      return res.status(401).json({ message: 'Invalid admin session.' });
    }
    req.adminId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}
