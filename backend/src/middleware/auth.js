import jwt from 'jsonwebtoken';

export function auth(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Nedostaje token' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, email, role }
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: 'Zabranjen pristup' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Neispravan token' });
    }
  };
}
