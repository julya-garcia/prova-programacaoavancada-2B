const { createApp } = require('./app');
const { createUserServiceClient } = require('./userServiceClient');

const port = Number(process.env.AUTH_SERVICE_PORT || 3002);
const jwtSecret = process.env.JWT_SECRET || 'troque-este-segredo-jwt-em-producao';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
const internalApiKey = process.env.INTERNAL_API_KEY || 'troque-esta-chave-interna-em-producao';
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const userServiceClient = createUserServiceClient({ baseUrl: userServiceUrl, internalApiKey });
const app = createApp({ userServiceClient, jwtSecret, jwtExpiresIn, corsOrigins, port });

app.listen(port, () => {
  console.log(`Auth Service: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
});

