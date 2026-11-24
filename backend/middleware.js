const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }
  try {
    const payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

module.exports = requireAuth;
