function createOpenApi(port) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Microsserviço de Autenticação',
      version: '1.0.0',
      description: 'Valida e-mail e senha no serviço de usuários e emite um token JWT.'
    },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [{ name: 'Autenticação' }, { name: 'Sistema' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Login: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'maria@email.com' },
            password: { type: 'string', format: 'password', example: 'Senha@123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' }, tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'string', example: '1h' },
            user: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: { tags: ['Sistema'], summary: 'Verifica a saúde do serviço', responses: { 200: { description: 'Serviço disponível' } } }
      },
      '/api/auth/login': {
        post: {
          tags: ['Autenticação'], summary: 'Autentica um usuário',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
          responses: {
            200: { description: 'Login realizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            400: { description: 'Corpo da requisição inválido' },
            401: { description: 'E-mail ou senha inválidos' },
            503: { description: 'Serviço de usuários indisponível' }
          }
        }
      },
      '/api/auth/validate': {
        get: {
          tags: ['Autenticação'], summary: 'Valida um token JWT', security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Token válido' },
            401: { description: 'Token ausente, inválido ou expirado' }
          }
        }
      }
    }
  };
}

module.exports = { createOpenApi };
