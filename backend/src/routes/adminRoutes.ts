import express from 'express';
import {
  login,
  forgotPassword,
  resetPassword,
  changePassword,
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
  saveReceptionReport,
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

// Route de login séparée (pas de middleware authenticate)
const loginRouter = express.Router();
loginRouter.post('/login', validateAdminLogin, login);

const router = express.Router();

// Routes protégées (nécessitent authentification)
router.use(authenticate);

// PUT /api/admin/change-password - Changer le mot de passe de l'admin connecté
router.put('/change-password', changePassword);

// GET /api/admin/bookings - Toutes les réservations (dashboard)
router.get('/bookings', getAllBookings);

// GET /api/admin/stores/:storeId/bookings - Réservations d'un magasin
router.get('/stores/:storeId/bookings', requireStoreAccess, getStoreBookings);

// PUT /api/admin/bookings/:id/status - Changer le statut d'une réservation
router.put('/bookings/:id/status', validateUpdateStatus, updateBookingStatus);

// PUT /api/admin/bookings/:id/confirm - Mettre à jour et confirmer une réservation
router.put('/bookings/:id/confirm', validateAdminUpdateAndConfirmBooking, adminUpdateAndConfirmBooking);

// POST /api/admin/bookings/:id/reception-report - Enregistrer un état des lieux
router.post('/bookings/:id/reception-report', saveReceptionReport);

// GET /api/admin/stores/:storeId/availability-blocks - Blocages d'un magasin
router.get('/stores/:storeId/availability-blocks', requireStoreAccess, getStoreAvailabilityBlocks);

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
router.put('/stores/:id', requireStoreAccess, updateStore);

// DELETE /api/admin/stores/:id - Supprimer un magasin
router.delete('/stores/:id', requireSuperAdmin, deleteStore);

// GET /api/admin/stores/:storeId/stats - Statistiques d'un magasin
router.get('/stores/:storeId/stats', requireStoreAccess, getStoreStats);

export { router, loginRouter };
