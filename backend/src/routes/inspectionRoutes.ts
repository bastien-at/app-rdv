import express from 'express';
import {
  createOrUpdateInspection,
  uploadInspectionPhotos,
  sendInspection,
  createOrUpdateReceptionReport,
  sendReceptionReport,
  getInspectionByBooking,
  getReceptionReportByBooking,
} from '../controllers/inspectionController';

const router = express.Router();

// Routes pour les états des lieux
router.post('/bookings/:bookingId/inspection', createOrUpdateInspection);
router.post('/inspections/:inspectionId/photos', uploadInspectionPhotos);
router.post('/inspections/:inspectionId/send', sendInspection);
router.get('/bookings/:bookingId/inspection', getInspectionByBooking);

// Routes pour les PV de réception
router.post('/bookings/:bookingId/reception-report', createOrUpdateReceptionReport);
router.post('/reception-reports/:reportId/send', sendReceptionReport);
router.get('/bookings/:bookingId/reception-report', getReceptionReportByBooking);

export default router;
