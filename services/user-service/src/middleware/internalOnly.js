function internalOnly(internalApiKey) {
  return (req, res, next) => {
    if (req.headers['x-internal-api-key'] !== internalApiKey) {
      return res.status(403).json({ error: 'Acesso interno não autorizado.' });
    }
    return next();
  };
}

module.exports = { internalOnly };

