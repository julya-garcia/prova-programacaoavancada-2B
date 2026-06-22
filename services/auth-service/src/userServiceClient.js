function createUserServiceClient({ baseUrl, internalApiKey }) {
  return {
    async findByEmail(email) {
      let response;
      try {
        response = await fetch(`${baseUrl}/internal/users/by-email/${encodeURIComponent(email)}`, {
          headers: { 'X-Internal-Api-Key': internalApiKey },
          signal: AbortSignal.timeout(5000)
        });
      } catch {
        const error = new Error('O serviço de usuários está indisponível.');
        error.status = 503;
        throw error;
      }

      if (response.status === 404) return null;
      if (!response.ok) {
        const error = new Error('Falha na comunicação com o serviço de usuários.');
        error.status = 502;
        throw error;
      }
      return response.json();
    }
  };
}

module.exports = { createUserServiceClient };

