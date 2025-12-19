
import request from 'supertest';
import app from '../server';
import { query, closePool } from '../db';

// On s'assure que le serveur ne démarre pas réellement
// grâce à la condition dans server.ts et NODE_ENV=test

describe('API Integration Tests', () => {
  
  afterAll(async () => {
    // Fermer le pool de connexions après tous les tests
    await closePool();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'API opérationnelle'
      });
    });
  });

  describe('GET /api/unknown-route', () => {
    it('should return 404', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route non trouvée');
    });
  });

  describe('GET /api/stores', () => {
    it('should return list of stores from DB', async () => {
      // Mock de la réponse DB
      const mockStores = [
        { id: 1, name: 'Magasin Test', city: 'Paris' }
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockStores });

      const response = await request(app).get('/api/stores');
      
      expect(response.status).toBe(200);
      // Le controlleur renvoie directement le tableau des magasins
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('name', 'Magasin Test');
      // Vérifie que la query a été appelée
      expect(query).toHaveBeenCalled();
    });
  });

});
