const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { authenticate } = require('./authenticate');
const { createOpenApi } = require('./openapi');

function corsOptions(origins) {
  const allowed = origins.split(',').map((origin) => origin.trim()).filter(Boolean);
  return {
    origin(origin, callback) {
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Origem não permitida pelo CORS.'));
    }
  };
}

function createApp({ userServiceClient, jwtSecret, jwtExpiresIn = '1h', corsOrigins = '*', port = 3002 }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(corsOptions(corsOrigins)));
  app.options(/.*/, cors(corsOptions(corsOrigins)));
  app.use(express.json({ limit: '20kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

  const openApi = createOpenApi(port);
  app.get('/api-docs.json', (_req, res) => res.json(openApi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApi));
  app.get('/health', (_req, res) => res.json({ service: 'auth-service', status: 'ok' }));

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body.password === 'string' ? req.body.password : '';
      if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

      const user = await userServiceClient.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      const accessToken = jwt.sign(
        { email: user.email, name: user.name },
        jwtSecret,
        { subject: user.id, expiresIn: jwtExpiresIn }
      );
      return res.json({
        accessToken, tokenType: 'Bearer', expiresIn: jwtExpiresIn,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/validate', authenticate(jwtSecret), (req, res) => {
    res.json({
      valid: true,
      user: { id: req.auth.sub, name: req.auth.name, email: req.auth.email }
    });
  });

  app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  app.use((error, _req, res, _next) => {
    if (error.message === 'Origem não permitida pelo CORS.') return res.status(403).json({ error: error.message });
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do serviço.' });
  });
  return app;
}

module.exports = { createApp };
