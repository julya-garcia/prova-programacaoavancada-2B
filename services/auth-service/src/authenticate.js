const jwt = require('jsonwebtoken');

function authenticate(jwtSecret) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token de acesso não informado.' });
    }

    try {
      req.auth = jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return res.status(401).json({ error: 'Token de acesso inválido ou expirado.' });
    }
  };
}

module.exports = { authenticate };

