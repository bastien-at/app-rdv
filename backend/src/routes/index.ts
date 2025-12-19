import express from 'express';
import storeRoutes from './storeRoutes';
import bookingRoutes from './bookingRoutes';
import serviceRoutes from './serviceRoutes';
import { router as adminRouter, loginRouter } from './adminRoutes';
import inspectionRoutes from './inspectionRoutes';
import customerDirectoryRoutes from './customerDirectoryRoutes';

const router = express.Router();

// Routes publiques
router.use('/stores', storeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/services', serviceRoutes);

// Route de login admin (publique)
router.use('/admin', loginRouter);

// Route de santé (à placer AVANT les middlewares globaux)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API opérationnelle' });
});

// Routes inspections (admin)
router.use('/', inspectionRoutes);

// Routes annuaire des clients (admin - contient un middleware auth global !)
router.use('/', customerDirectoryRoutes);

// Routes admin protégées
router.use('/admin', adminRouter);

export default router;
