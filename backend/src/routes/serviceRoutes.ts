import { Router, Request, Response } from 'express';
import { query } from '../db';
import { Service, ServiceHistory, CreateServiceData, UpdateServiceData } from '../types';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Fonction helper pour enregistrer l'historique
async function logServiceHistory(
  serviceId: string,
  action: ServiceHistory['action'],
  changedFields: Record<string, { old: any; new: any }> | undefined,
  changedBy: string | undefined,
  snapshot: Service
) {
  await query(
    `INSERT INTO service_history (service_id, action, changed_fields, changed_by, snapshot)
     VALUES ($1, $2, $3, $4, $5)`,
    [serviceId, action, JSON.stringify(changedFields), changedBy, JSON.stringify(snapshot)]
  );
}

// GET /api/services - Liste tous les services (publique)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { store_id, service_type, category, active } = req.query;
    
    let queryText = `
      SELECT s.*, st.name as store_name, st.city as store_city
      FROM services s
      LEFT JOIN stores st ON s.store_id = st.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (store_id) {
      queryText += ` AND (s.store_id = $${paramIndex} OR s.is_global = true)`;
      params.push(store_id);
      paramIndex++;
    }

    if (service_type) {
      queryText += ` AND s.service_type = $${paramIndex}`;
      params.push(service_type);
      paramIndex++;
    }

    // Catégorie désactivée temporairement (colonne non présente en DB)
    // if (category) {
    //   queryText += ` AND s.category = $${paramIndex}`;
    //   params.push(category);
    //   paramIndex++;
    // }

    if (active !== undefined) {
      queryText += ` AND s.active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    queryText += ` ORDER BY s.service_type, s.name`;

    const result = await query<Service>(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des services'
    });
  }
});

// GET /api/services/:id - Récupère un service spécifique
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query<Service>(
      `SELECT s.*, st.name as store_name, st.city as store_city
       FROM services s
       LEFT JOIN stores st ON s.store_id = st.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur récupération service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du service'
    });
  }
});

// POST /api/services - Crée un nouveau service (admin uniquement)
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const serviceData: CreateServiceData = req.body;
    const adminEmail = (req as any).admin?.email;

    // Validation
    if (!serviceData.name || !serviceData.service_type || !serviceData.duration_minutes || serviceData.price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes (name, service_type, duration_minutes, price requis)'
      });
    }

    const result = await query<Service>(
      `INSERT INTO services (
        store_id, service_type, name, description, duration_minutes, 
        price, is_global, active, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        serviceData.store_id || null,
        serviceData.service_type,
        serviceData.name,
        serviceData.description || null,
        serviceData.duration_minutes,
        serviceData.price,
        serviceData.is_global || false,
        serviceData.active !== false,
        adminEmail
      ]
    );

    const newService = result.rows[0];

    // Enregistrer dans l'historique
    await logServiceHistory(newService.id, 'created', undefined, adminEmail, newService);

    res.status(201).json({
      success: true,
      data: newService,
      message: 'Service créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du service'
    });
  }
});

// PUT /api/services/:id - Met à jour un service (admin uniquement)
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateServiceData = req.body;
    const adminEmail = (req as any).admin?.email;

    // Récupérer l'ancien service
    const oldServiceResult = await query<Service>('SELECT * FROM services WHERE id = $1', [id]);
    if (oldServiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }
    const oldService = oldServiceResult.rows[0];

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    const changedFields: Record<string, { old: any; new: any }> = {};

    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'image_url') {
        return; // on ignore le champ image côté backend
      }
      if (value !== undefined && (oldService as any)[key] !== value) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        changedFields[key] = { old: (oldService as any)[key], new: value };
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.json({
        success: true,
        data: oldService,
        message: 'Aucune modification'
      });
    }

    // Ajouter updated_by
    updates.push(`updated_by = $${paramIndex}`);
    params.push(adminEmail);
    paramIndex++;

    params.push(id);

    const result = await query<Service>(
      `UPDATE services SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedService = result.rows[0];

    // Enregistrer dans l'historique
    await logServiceHistory(id, 'updated', changedFields, adminEmail, updatedService);

    res.json({
      success: true,
      data: updatedService,
      message: 'Service mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du service'
    });
  }
});

// DELETE /api/services/:id - Supprime un service (admin uniquement)
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminEmail = (req as any).admin?.email;

    // Récupérer le service avant suppression
    const serviceResult = await query<Service>('SELECT * FROM services WHERE id = $1', [id]);
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }
    const service = serviceResult.rows[0];

    // Enregistrer dans l'historique avant suppression
    await logServiceHistory(id, 'deleted', undefined, adminEmail, service);

    // Supprimer le service
    await query('DELETE FROM services WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Service supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du service'
    });
  }
});

// GET /api/services/:id/history - Récupère l'historique d'un service (admin uniquement)
router.get('/:id/history', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query<ServiceHistory>(
      `SELECT * FROM service_history 
       WHERE service_id = $1 
       ORDER BY changed_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

// GET /api/services/categories/list - Liste toutes les catégories disponibles
// Désactivé car la colonne category n'existe pas
// router.get('/categories/list', async (req: Request, res: Response) => {
//   try {
//     const result = await query<{ category: string }>(
//       `SELECT DISTINCT category 
//        FROM services 
//        WHERE category IS NOT NULL 
//        ORDER BY category`
//     );

//     res.json({
//       success: true,
//       data: result.rows.map(r => r.category)
//     });
//   } catch (error) {
//     console.error('Erreur récupération catégories:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de la récupération des catégories'
//     });
//   }
// });

export default router;
