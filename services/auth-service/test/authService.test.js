process.env.NODE_ENV = 'test';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'segredo-de-teste-com-tamanho-adequado';

async function testApp(user = null) {
  const userServiceClient = { async findByEmail() { return user; } };
  return createApp({ userServiceClient, jwtSecret, jwtExpiresIn: '1h', corsOrigins: '*' });
}

describe('microsserviço de autenticação', () => {
  test('autentica e emite um JWT válido', async () => {
    const user = {
      id: '93cb34ea-5916-47ac-b525-dd6f020f887e', name: 'Maria Silva', email: 'maria@email.com',
      passwordHash: await bcrypt.hash('Senha@123', 4)
    };
    const response = await request(await testApp(user)).post('/api/auth/login').send({
      email: user.email, password: 'Senha@123'
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.tokenType, 'Bearer');
    assert.equal(jwt.verify(response.body.accessToken, jwtSecret).sub, user.id);
  });

  test('rejeita credenciais inválidas', async () => {
    const user = {
      id: '1', name: 'Maria', email: 'maria@email.com',
      passwordHash: await bcrypt.hash('Senha@123', 4)
    };
    const wrongPassword = await request(await testApp(user)).post('/api/auth/login').send({
      email: user.email, password: 'senha-errada'
    });
    const unknownUser = await request(await testApp()).post('/api/auth/login').send({
      email: 'ninguem@email.com', password: 'Senha@123'
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
  });

  test('valida o corpo e publica a documentação OpenAPI', async () => {
    assert.equal((await request(await testApp()).post('/api/auth/login').send({})).status, 400);
    const docs = await request(await testApp()).get('/api-docs.json');
    assert.equal(docs.status, 200);
    assert.ok(docs.body.paths['/api/auth/login']);
  });
});

