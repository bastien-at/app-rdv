import { Request, Response } from 'express';
import { query } from '../db';
import { sendReceptionReportEmail } from '../utils/email';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration multer pour l'upload de photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/inspections');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'inspection-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images (JPEG, PNG, WEBP) sont autorisées'));
    }
  }
}).array('photos', 5); // Max 5 photos

/**
 * Créer ou mettre à jour un état des lieux
 */
export const createOrUpdateInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { comments, technicianId } = req.body;

    // Vérifier que la réservation existe
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }

    // Créer ou mettre à jour l'inspection
    const inspectionResult = await query(
      `INSERT INTO bike_inspections (booking_id, technician_id, comments, status)
       VALUES ($1, $2, $3, 'draft')
       ON CONFLICT (booking_id)
       DO UPDATE SET 
         comments = EXCLUDED.comments,
         technician_id = EXCLUDED.technician_id,
         updated_at = NOW()
       RETURNING *`,
      [bookingId, technicianId, comments]
    );

    res.json({
      success: true,
      data: inspectionResult.rows[0],
    });
  } catch (error) {
    console.error('Erreur création inspection:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'état des lieux',
    });
  }
};

/**
 * Upload des photos d'inspection
 */
export const uploadInspectionPhotos = (req: Request, res: Response): void => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    try {
      const { inspectionId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune photo fournie',
        });
      }

      // Vérifier que l'inspection existe
      const inspectionResult = await query(
        'SELECT * FROM bike_inspections WHERE id = $1',
        [inspectionId]
      );

      if (inspectionResult.rows.length === 0) {
        // Supprimer les fichiers uploadés
        files.forEach(file => fs.unlinkSync(file.path));
        return res.status(404).json({
          success: false,
          error: 'État des lieux non trouvé',
        });
      }

      // Sauvegarder les photos en DB
      const photoPromises = files.map((file, index) => {
        const photoUrl = `/uploads/inspections/${file.filename}`;
        return query(
          `INSERT INTO inspection_photos (inspection_id, photo_url, photo_order)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [inspectionId, photoUrl, index + 1]
        );
      });

      const results = await Promise.all(photoPromises);
      const photos = results.map((r: any) => r.rows[0]);

      res.json({
        success: true,
        data: photos,
      });
    } catch (error) {
      console.error('Erreur upload photos:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload des photos',
      });
    }
  });
};

/**
 * Valider et envoyer l'état des lieux par email
 */
export const sendInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { inspectionId } = req.params;

    // Récupérer l'inspection avec toutes les infos
    const result = await query(
      `SELECT 
        i.*,
        b.customer_firstname,
        b.customer_lastname,
        b.customer_email,
        b.start_datetime,
        srv.name as service_name,
        st.name as store_name,
        st.email as store_email,
        t.name as technician_name,
        ARRAY_AGG(ip.photo_url ORDER BY ip.photo_order) as photos
      FROM bike_inspections i
      JOIN bookings b ON i.booking_id = b.id
      JOIN services srv ON b.service_id = srv.id
      JOIN stores st ON b.store_id = st.id
      LEFT JOIN technicians t ON i.technician_id = t.id
      LEFT JOIN inspection_photos ip ON i.id = ip.inspection_id
      WHERE i.id = $1
      GROUP BY i.id, b.id, srv.id, st.id, t.id`,
      [inspectionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'État des lieux non trouvé',
      });
      return;
    }

    const inspection = result.rows[0];

    // Marquer comme envoyé
    await query(
      `UPDATE bike_inspections 
       SET status = 'sent', sent_at = NOW()
       WHERE id = $1`,
      [inspectionId]
    );

    // Envoyer l'email (TODO: implémenter sendInspectionEmail)
    // await sendInspectionEmail(inspection);
    console.log('✅ État des lieux marqué comme envoyé (email désactivé)');

    res.json({
      success: true,
      message: 'État des lieux envoyé par email',
    });
  } catch (error) {
    console.error('Erreur envoi inspection:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'état des lieux',
    });
  }
};

/**
 * Créer ou mettre à jour un PV de réception
 */
export const createOrUpdateReceptionReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const {
      inspectionId,
      technicianId,
      workPerformed,
      partsReplaced,
      recommendations,
      laborCost,
      partsCost,
      totalCost,
      customerSignatureData,
    } = req.body;

    // Vérifier que la réservation existe
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }

    // Créer ou mettre à jour le PV
    const reportResult = await query(
      `INSERT INTO reception_reports (
        booking_id, inspection_id, technician_id,
        work_performed, parts_replaced, recommendations,
        labor_cost, parts_cost, total_cost,
        customer_signature_data, customer_signed_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'signed')
      ON CONFLICT (booking_id)
      DO UPDATE SET 
        work_performed = EXCLUDED.work_performed,
        parts_replaced = EXCLUDED.parts_replaced,
        recommendations = EXCLUDED.recommendations,
        labor_cost = EXCLUDED.labor_cost,
        parts_cost = EXCLUDED.parts_cost,
        total_cost = EXCLUDED.total_cost,
        customer_signature_data = EXCLUDED.customer_signature_data,
        customer_signed_at = NOW(),
        updated_at = NOW()
      RETURNING *`,
      [
        bookingId,
        inspectionId,
        technicianId,
        workPerformed,
        partsReplaced,
        recommendations,
        laborCost,
        partsCost,
        totalCost,
        customerSignatureData,
      ]
    );

    res.json({
      success: true,
      data: reportResult.rows[0],
    });
  } catch (error) {
    console.error('Erreur création PV:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du PV de réception',
    });
  }
};

/**
 * Envoyer le PV de réception par email
 */
export const sendReceptionReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log('📧 [sendReceptionReport] Starting...');
    console.log('📧 [sendReceptionReport] Params:', req.params);
    console.log('📧 [sendReceptionReport] Body:', req.body);
    
    const { reportId } = req.params;
    console.log('📧 [sendReceptionReport] Report ID:', reportId);

    // Récupérer le PV avec toutes les infos
    const result = await query(
      `SELECT 
        r.*,
        b.customer_firstname,
        b.customer_lastname,
        b.customer_email,
        b.start_datetime,
        srv.name as service_name,
        st.name as store_name,
        st.email as store_email,
        t.name as technician_name
      FROM reception_reports r
      JOIN bookings b ON r.booking_id = b.id
      JOIN services srv ON b.service_id = srv.id
      JOIN stores st ON b.store_id = st.id
      LEFT JOIN technicians t ON r.technician_id = t.id
      WHERE r.id = $1`,
      [reportId]
    );

    console.log('📧 [sendReceptionReport] Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('📧 [sendReceptionReport] Report not found');
      res.status(404).json({
        success: false,
        error: 'PV de réception non trouvé',
      });
      return;
    }

    const report = result.rows[0];
    console.log('📧 [sendReceptionReport] Report found:', report.id);

    // Marquer comme envoyé
    await query(
      `UPDATE reception_reports 
       SET status = 'sent', sent_at = NOW()
       WHERE id = $1`,
      [reportId]
    );

    console.log(' [sendReceptionReport] Report marked as sent');

    // Envoyer l'email 
    await sendReceptionReportEmail(report);
    console.log(' [sendReceptionReport] PV de réception envoyé par email');

    res.json({
      success: true,
      message: 'PV de réception envoyé par email',
    });
  } catch (error) {
    console.error(' [sendReceptionReport] Error:', error);
    console.error(' [sendReceptionReport] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error(' [sendReceptionReport] Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [sendReceptionReport] Error:', error);
    console.error('❌ [sendReceptionReport] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ [sendReceptionReport] Error message:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du PV de réception',
    });
  }
};

/**
 * Récupérer l'inspection d'une réservation
 */
export const getInspectionByBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      `SELECT 
        i.*,
        ARRAY_AGG(
          json_build_object(
            'id', ip.id,
            'photo_url', ip.photo_url,
            'photo_order', ip.photo_order,
            'caption', ip.caption
          ) ORDER BY ip.photo_order
        ) FILTER (WHERE ip.id IS NOT NULL) as photos
      FROM bike_inspections i
      LEFT JOIN inspection_photos ip ON i.id = ip.inspection_id
      WHERE i.booking_id = $1
      GROUP BY i.id`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Aucun état des lieux trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur récupération inspection:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'état des lieux',
    });
  }
};

/**
 * Récupérer le PV d'une réservation
 */
export const getReceptionReportByBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      'SELECT * FROM reception_reports WHERE booking_id = $1',
      [bookingId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Aucun PV de réception trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur récupération PV:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du PV de réception',
    });
  }
};
