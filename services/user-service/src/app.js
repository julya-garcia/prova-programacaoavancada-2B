const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { authenticate } = require('./middleware/authenticate');
const { internalOnly } = require('./middleware/internalOnly');
const { createOpenApi } = require('./openapi');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = ({ passwordHash, ...user }) => user;

function corsOptions(origins) {
  const allowed = origins.split(',').map((origin) => origin.trim()).filter(Boolean);
  return {
    origin(origin, callback) {
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Origem não permitida pelo CORS.'));
    }
  };
}

function createApp({ repository, jwtSecret, internalApiKey, corsOrigins = '*', port = 3001 }) {
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

  app.get('/health', (_req, res) => res.json({ service: 'user-service', status: 'ok' }));

  app.post('/api/users', async (req, res, next) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body.password === 'string' ? req.body.password : '';

      if (name.length < 2 || !emailPattern.test(email) || password.length < 8) {
        return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
      }
      if (repository.findByEmail(email)) {
        return res.status(409).json({ error: 'E-mail já cadastrado.' });
      }

      const user = {
        id: crypto.randomUUID(), name, email,
        passwordHash: await bcrypt.hash(password, 12),
        createdAt: new Date().toISOString()
      };
      repository.create(user);
      return res.status(201).json(publicUser(user));
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/users', authenticate(jwtSecret), (_req, res) => {
    res.json(repository.findAll().map(publicUser));
  });

  app.get('/api/users/:id', authenticate(jwtSecret), (req, res) => {
    const user = repository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(publicUser(user));
  });

  app.get('/internal/users/by-email/:email', internalOnly(internalApiKey), (req, res) => {
    const user = repository.findByEmail(decodeURIComponent(req.params.email));
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(user);
  });

  app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  app.use((error, _req, res, _next) => {
    if (error.message === 'Origem não permitida pelo CORS.') return res.status(403).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do serviço.' });
  });
  return app;
}

module.exports = { createApp };

