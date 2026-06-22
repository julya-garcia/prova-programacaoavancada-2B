process.env.NODE_ENV = 'test';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');
const { UserRepository } = require('../src/repositories/userRepository');

const jwtSecret = 'segredo-de-teste-com-tamanho-adequado';
const internalApiKey = 'chave-interna-de-teste';
let tempDirectory;
let app;

beforeEach(() => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'users-service-'));
  const repository = new UserRepository(path.join(tempDirectory, 'users.json'));
  app = createApp({ repository, jwtSecret, internalApiKey, corsOrigins: 'http://localhost:5173' });
});

afterEach(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));

describe('microsserviço de usuários', () => {
  test('cria um usuário sem expor a senha', async () => {
    const response = await request(app).post('/api/users').send({
      name: 'Maria Silva', email: 'MARIA@email.com', password: 'Senha@123'
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.email, 'maria@email.com');
    assert.equal(response.body.password, undefined);
    assert.equal(response.body.passwordHash, undefined);
  });

  test('impede e-mail duplicado e dados inválidos', async () => {
    const user = { name: 'Maria Silva', email: 'maria@email.com', password: 'Senha@123' };
    assert.equal((await request(app).post('/api/users').send(user)).status, 201);
    assert.equal((await request(app).post('/api/users').send(user)).status, 409);
    assert.equal((await request(app).post('/api/users').send({ name: 'A' })).status, 400);
  });

  test('protege e permite a consulta com JWT válido', async () => {
    const created = await request(app).post('/api/users').send({
      name: 'Maria Silva', email: 'maria@email.com', password: 'Senha@123'
    });
    assert.equal((await request(app).get('/api/users')).status, 401);

    const token = jwt.sign({ email: created.body.email }, jwtSecret, { subject: created.body.id, expiresIn: '1h' });
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    const byId = await request(app).get(`/api/users/${created.body.id}`).set('Authorization', `Bearer ${token}`);

    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(me.status, 200);
    assert.equal(me.body.id, created.body.id);
    assert.equal(byId.status, 200);
    assert.equal(byId.body.id, created.body.id);
  });

  test('protege o endpoint interno com chave de serviço', async () => {
    await request(app).post('/api/users').send({
      name: 'Maria Silva', email: 'maria@email.com', password: 'Senha@123'
    });
    assert.equal((await request(app).get('/internal/users/by-email/maria%40email.com')).status, 403);
    const response = await request(app)
      .get('/internal/users/by-email/maria%40email.com')
      .set('X-Internal-Api-Key', internalApiKey);
    assert.equal(response.status, 200);
    assert.ok(response.body.passwordHash);
  });

  test('libera somente as origens configuradas no CORS', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    const blocked = await request(app).get('/health').set('Origin', 'https://origem-invalida.test');
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(blocked.status, 403);
  });

  test('publica a documentação OpenAPI', async () => {
    const response = await request(app).get('/api-docs.json');
    assert.equal(response.status, 200);
    assert.ok(response.body.paths['/api/users']);
    assert.ok(response.body.paths['/api/users/me']);
    assert.ok(response.body.paths['/api/users/{id}']);
    assert.ok(response.body.paths['/internal/users/by-email/{email}']);
  });
});
