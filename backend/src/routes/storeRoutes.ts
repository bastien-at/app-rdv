import express from 'express';
import {
  getAllStores,
  getStoreById,
  getStoreBySlug,
  getStoreServices,
  getStoreWithServices,
} from '../controllers/storeController';
import { getAvailability } from '../controllers/availabilityController';
import { validateAvailability } from '../middleware/validation';

const router = express.Router();

// GET /api/stores - Liste tous les magasins
router.get('/', getAllStores);

// GET /api/stores/by-slug/:slug - Magasin par slug (AVANT /:id pour éviter les conflits)
router.get('/by-slug/:slug', getStoreBySlug);

// GET /api/stores/:id - Détails d'un magasin
router.get('/:id', getStoreById);

// GET /api/stores/:id/services - Services d'un magasin
router.get('/:id/services', getStoreServices);

// GET /api/stores/:id/with-services - Magasin avec ses services
router.get('/:id/with-services', getStoreWithServices);

// GET /api/stores/:storeId/availability - Créneaux disponibles
router.get('/:storeId/availability', validateAvailability, getAvailability);

export default router;
