import express from 'express';
import {
  login,
  getAllBookings,
  getStoreBookings,
  updateBookingStatus,
  adminUpdateAndConfirmBooking,
  getStoreAvailabilityBlocks,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getStoreStats,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController';
import {
  createStore,
  updateStore,
  deleteStore,
} from '../controllers/storeController';
import { authenticate, requireStoreAccess, requireSuperAdmin } from '../middleware/auth';
import {
  validateAdminLogin,
  validateUpdateStatus,
  validateCreateBlock,
  validateAdminUpdateAndConfirmBooking,
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

// PUT /api/admin/bookings/:id/confirm - Mettre à jour et confirmer une réservation
router.put('/bookings/:id/confirm', validateAdminUpdateAndConfirmBooking, adminUpdateAndConfirmBooking);

// POST /api/admin/availability-blocks - Créer un blocage
router.post('/availability-blocks', validateCreateBlock, createAvailabilityBlock);

// DELETE /api/admin/availability-blocks/:id - Supprimer un blocage
router.delete('/availability-blocks/:id', deleteAvailabilityBlock);

// Routes super admin uniquement
// GET /api/admin/admins - Liste tous les administrateurs
router.get('/admins', requireSuperAdmin, getAllAdmins);

// POST /api/admin/admins - Créer un administrateur
router.post('/admins', requireSuperAdmin, createAdmin);

// PUT /api/admin/admins/:id - Mettre à jour un administrateur
router.put('/admins/:id', requireSuperAdmin, updateAdmin);

// DELETE /api/admin/admins/:id - Supprimer un administrateur
router.delete('/admins/:id', requireSuperAdmin, deleteAdmin);

// POST /api/admin/stores - Créer un magasin
router.post('/stores', requireSuperAdmin, createStore);

// PUT /api/admin/stores/:id - Mettre à jour un magasin
router.put('/stores/:id', requireSuperAdmin, updateStore);

// DELETE /api/admin/stores/:id - Supprimer un magasin
router.delete('/stores/:id', requireSuperAdmin, deleteStore);

// GET /api/admin/stores/:storeId/stats - Statistiques d'un magasin
router.get('/stores/:storeId/stats', requireStoreAccess, getStoreStats);

export default router;
