import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';

/**
 * Middleware pour vérifier les erreurs de validation
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Erreur de validation',
      details: errors.array(),
    });
    return;
  }
  
  next();
};

/**
 * Validations pour la création d'une réservation
 */
export const validateCreateBooking = [
  body('store_id').isUUID().withMessage('ID magasin invalide'),
  body('service_id').isUUID().withMessage('ID service invalide'),
  body('start_datetime').isISO8601().withMessage('Date/heure invalide'),
  body('customer_firstname')
    .trim()
    .notEmpty().withMessage('Prénom requis')
    .isLength({ max: 100 }).withMessage('Prénom trop long'),
  body('customer_lastname')
    .trim()
    .notEmpty().withMessage('Nom requis')
    .isLength({ max: 100 }).withMessage('Nom trop long'),
  body('customer_email')
    .trim()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('customer_phone')
    .trim()
    .matches(/^(\+33|0)[1-9](\d{2}){4}$/).withMessage('Numéro de téléphone français invalide'),
  body('customer_data').optional().isObject(),
  body('customer_data.height').optional().isInt({ min: 100, max: 250 }),
  body('customer_data.weight').optional().isInt({ min: 30, max: 200 }),
  body('customer_data.shoe_size').optional().isInt({ min: 30, max: 55 }),
  validate,
];

/**
 * Validations pour la mise à jour d'une réservation
 */
export const validateUpdateBooking = [
  param('token').notEmpty().withMessage('Token requis'),
  body('start_datetime').optional().isISO8601().withMessage('Date/heure invalide'),
  body('customer_firstname').optional().trim().isLength({ max: 100 }),
  body('customer_lastname').optional().trim().isLength({ max: 100 }),
  body('customer_email').optional().trim().isEmail().normalizeEmail(),
  body('customer_phone').optional().trim().matches(/^(\+33|0)[1-9](\d{2}){4}$/),
  body('customer_data').optional().isObject(),
  validate,
];

/**
 * Validations pour la requête de disponibilité
 */
export const validateAvailability = [
  param('storeId').isUUID().withMessage('ID magasin invalide'),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Format de date invalide (YYYY-MM-DD)'),
  query('service_id').isUUID().withMessage('ID service invalide'),
  validate,
];

/**
 * Validations pour la connexion admin
 */
export const validateAdminLogin = [
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  validate,
];

/**
 * Validations pour la création d'un blocage
 */
export const validateCreateBlock = [
  body('store_id').isUUID().withMessage('ID magasin invalide'),
  body('start_datetime').isISO8601().withMessage('Date/heure de début invalide'),
  body('end_datetime').isISO8601().withMessage('Date/heure de fin invalide'),
  body('reason').optional().trim().isLength({ max: 255 }),
  body('technician_id').optional().isUUID(),
  validate,
];

/**
 * Validations pour la mise à jour du statut
 */
export const validateUpdateStatus = [
  param('id').isUUID().withMessage('ID réservation invalide'),
  body('status')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .withMessage('Statut invalide'),
  body('internal_notes').optional().trim(),
  validate,
];

/**
 * Validations pour la mise à jour + confirmation d'une réservation côté admin
 */
export const validateAdminUpdateAndConfirmBooking = [
  param('id').isUUID().withMessage('ID réservation invalide'),
  body('service_id').optional().isUUID().withMessage('ID service invalide'),
  body('start_datetime').optional().isISO8601().withMessage('Date/heure invalide'),
  body('technician_id').optional().isUUID().withMessage('ID technicien invalide'),
  body('internal_notes').optional().trim(),
  validate,
];
