const path = require('node:path');
const { createApp } = require('./app');
const { UserRepository } = require('./repositories/userRepository');

const port = Number(process.env.USER_SERVICE_PORT || 3001);
const jwtSecret = process.env.JWT_SECRET || 'troque-este-segredo-jwt-em-producao';
const internalApiKey = process.env.INTERNAL_API_KEY || 'troque-esta-chave-interna-em-producao';
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173';
const dataFile = process.env.USERS_FILE || path.join(__dirname, '..', 'data', 'users.json');

const repository = new UserRepository(dataFile);
const app = createApp({ repository, jwtSecret, internalApiKey, corsOrigins, port });

app.listen(port, () => {
  console.log(`User Service: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
});

