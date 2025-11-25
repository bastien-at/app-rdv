import express from 'express';
import storeRoutes from './storeRoutes';
import bookingRoutes from './bookingRoutes';
import serviceRoutes from './serviceRoutes';
import adminRoutes from './adminRoutes';
import inspectionRoutes from './inspectionRoutes';

const router = express.Router();

// Routes publiques
router.use('/stores', storeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/services', serviceRoutes);

// Routes inspections (admin)
router.use('/', inspectionRoutes);

// Routes admin
router.use('/admin', adminRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API opérationnelle' });
});

export default router;
