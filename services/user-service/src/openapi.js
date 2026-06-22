function createOpenApi(port) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Microsserviço de Usuários',
      version: '1.0.0',
      description: 'Criação e consulta de usuários. As consultas exigem um JWT emitido pelo serviço de autenticação.'
    },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [
      { name: 'Usuários' },
      { name: 'Interno', description: 'Endpoint usado somente entre os microsserviços.' },
      { name: 'Sistema' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        internalApiKey: { type: 'apiKey', in: 'header', name: 'X-Internal-Api-Key' }
      },
      schemas: {
        NewUser: {
          type: 'object', required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Maria Silva' },
            email: { type: 'string', format: 'email', example: 'maria@email.com' },
            password: { type: 'string', minLength: 8, format: 'password', example: 'Senha@123' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    paths: {
      '/health': {
        get: { tags: ['Sistema'], summary: 'Verifica a saúde do serviço', responses: { 200: { description: 'Serviço disponível' } } }
      },
      '/api/users': {
        post: {
          tags: ['Usuários'], summary: 'Cria um usuário',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUser' } } } },
          responses: {
            201: { description: 'Usuário criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            400: { description: 'Dados inválidos' }, 409: { description: 'E-mail já cadastrado' }
          }
        },
        get: {
          tags: ['Usuários'], summary: 'Lista todos os usuários', security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Lista de usuários', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
            401: { description: 'JWT ausente, inválido ou expirado' }
          }
        }
      },
      '/api/users/{id}': {
        get: {
          tags: ['Usuários'], summary: 'Consulta um usuário pelo ID', security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Usuário encontrado' }, 401: { description: 'Não autenticado' }, 404: { description: 'Usuário não encontrado' } }
        }
      },
      '/internal/users/by-email/{email}': {
        get: {
          tags: ['Interno'], summary: 'Obtém os dados de autenticação pelo e-mail', security: [{ internalApiKey: [] }],
          parameters: [{ name: 'email', in: 'path', required: true, schema: { type: 'string', format: 'email' } }],
          responses: { 200: { description: 'Usuário interno encontrado' }, 403: { description: 'Chave interna inválida' }, 404: { description: 'Usuário não encontrado' } }
        }
      }
    }
  };
}

module.exports = { createOpenApi };

