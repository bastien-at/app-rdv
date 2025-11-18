import express from 'express';
import {
  createBooking,
  getBookingByToken,
  updateBooking,
  cancelBooking,
  searchBookingsByEmail,
} from '../controllers/bookingController';
import {
  validateCreateBooking,
  validateUpdateBooking,
} from '../middleware/validation';

const router = express.Router();

// GET /api/bookings/search - Rechercher des réservations par email
router.get('/search', searchBookingsByEmail);

// POST /api/bookings - Créer une réservation
router.post('/', validateCreateBooking, createBooking);

// GET /api/bookings/:token - Détails d'une réservation
router.get('/:token', getBookingByToken);

// PUT /api/bookings/:token - Modifier une réservation
router.put('/:token', validateUpdateBooking, updateBooking);

// DELETE /api/bookings/:token - Annuler une réservation
router.delete('/:token', cancelBooking);

export default router;
