const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  next();
};

const vendedorOnly = (req, res, next) => {
  if (req.user.usertype !== 'vendedor')
    return res.status(403).json({ error: 'Solo vendedores' });
  next();
};

module.exports = { authMiddleware, adminOnly, vendedorOnly };