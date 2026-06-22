process.env.NODE_ENV = 'test';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { UserRepository } = require('../services/user-service/src/repositories/userRepository');
const { createApp: createUserApp } = require('../services/user-service/src/app');
const { createApp: createAuthApp } = require('../services/auth-service/src/app');
const { createUserServiceClient } = require('../services/auth-service/src/userServiceClient');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('fluxo completo entre os microsserviços', async (context) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'users-e2e-'));
  const jwtSecret = 'segredo-e2e-com-tamanho-seguro';
  const internalApiKey = 'chave-interna-e2e';
  const repository = new UserRepository(path.join(tempDirectory, 'users.json'));
  const userApp = createUserApp({
    repository, jwtSecret, internalApiKey, corsOrigins: 'http://localhost:5173'
  });
  const userServer = await listen(userApp);
  const usersUrl = `http://127.0.0.1:${userServer.address().port}`;
  const userServiceClient = createUserServiceClient({ baseUrl: usersUrl, internalApiKey });
  const authApp = createAuthApp({
    userServiceClient, jwtSecret, jwtExpiresIn: '1h', corsOrigins: 'http://localhost:5173'
  });
  const authServer = await listen(authApp);
  const authUrl = `http://127.0.0.1:${authServer.address().port}`;

  context.after(async () => {
    await close(authServer);
    await close(userServer);
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  assert.equal((await fetch(`${usersUrl}/health`)).status, 200);
  assert.equal((await fetch(`${authUrl}/health`)).status, 200);

  const email = `teste.${Date.now()}@email.com`;
  const userPayload = { name: 'Usuária Teste', email, password: 'Senha@123' };
  const createdResponse = await fetch(`${usersUrl}/api/users`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(userPayload)
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.passwordHash, undefined);

  const loginResponse = await fetch(`${authUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Senha@123' })
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const authorization = { authorization: `Bearer ${login.accessToken}` };

  const listResponse = await fetch(`${usersUrl}/api/users`, { headers: authorization });
  const meResponse = await fetch(`${usersUrl}/api/users/me`, { headers: authorization });
  const validateResponse = await fetch(`${authUrl}/api/auth/validate`, { headers: authorization });
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).length, 1);
  assert.equal((await meResponse.json()).id, created.id);
  assert.equal((await validateResponse.json()).valid, true);

  assert.equal((await fetch(`${usersUrl}/api/users`)).status, 401);
  assert.equal((await fetch(`${usersUrl}/health`, {
    headers: { origin: 'https://origem-bloqueada.test' }
  })).status, 403);
  assert.equal((await fetch(`${usersUrl}/api-docs.json`)).status, 200);
  assert.equal((await fetch(`${authUrl}/api-docs.json`)).status, 200);
  assert.equal((await fetch(`${usersUrl}/docs/`)).status, 200);
  assert.equal((await fetch(`${authUrl}/docs/`)).status, 200);
});

