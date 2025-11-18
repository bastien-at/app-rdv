import express from 'express';
import {
  login,
  getAllBookings,
  getStoreBookings,
  updateBookingStatus,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getStoreStats,
} from '../controllers/adminController';
import { authenticate, requireStoreAccess } from '../middleware/auth';
import {
  validateAdminLogin,
  validateUpdateStatus,
  validateCreateBlock,
} from '../middleware/validation';

const router = express.Router();

// POST /api/admin/login - Connexion admin
router.post('/login', validateAdminLogin, login);

// Routes protégées (nécessitent authentification)
router.use(authenticate);

// GET /api/admin/bookings - Toutes les réservations (dashboard)
router.get('/bookings', getAllBookings);

// GET /api/admin/stores/:storeId/bookings - Réservations d'un magasin
router.get('/stores/:storeId/bookings', requireStoreAccess, getStoreBookings);

// PUT /api/admin/bookings/:id/status - Changer le statut d'une réservation
router.put('/bookings/:id/status', validateUpdateStatus, updateBookingStatus);

// POST /api/admin/availability-blocks - Créer un blocage
router.post('/availability-blocks', validateCreateBlock, createAvailabilityBlock);

// DELETE /api/admin/availability-blocks/:id - Supprimer un blocage
router.delete('/availability-blocks/:id', deleteAvailabilityBlock);

// GET /api/admin/stores/:storeId/stats - Statistiques d'un magasin
router.get('/stores/:storeId/stats', requireStoreAccess, getStoreStats);

export default router;
