import { Request, Response } from 'express';
import { query } from '../db';
import { Service, CreateServiceData, UpdateServiceData } from '../types';

/**
 * Récupère tous les services
 */
export const getAllServices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await query<Service>(
      'SELECT * FROM services WHERE active = true ORDER BY service_type, name'
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des services',
    });
  }
};

/**
 * Récupère un service par ID
 */
export const getServiceById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query<Service>(
      'SELECT * FROM services WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du service:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du service',
    });
  }
};

/**
 * Crée un nouveau service
 */
export const createService = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      store_id,
      service_type,
      name,
      description,
      duration_minutes,
      price,
      category,
      image_url,
      is_global,
      active,
    }: CreateServiceData = req.body;
    
    const result = await query<Service>(
      `INSERT INTO services (
        store_id, service_type, name, description, duration_minutes, 
        price, category, image_url, is_global, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        store_id || null,
        service_type,
        name,
        description || null,
        duration_minutes,
        price,
        category || null,
        image_url || null,
        is_global || false,
        active !== undefined ? active : true,
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Service créé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du service:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du service',
    });
  }
};

/**
 * Met à jour un service
 */
export const updateService = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateServiceData = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(updateData.name);
      paramIndex++;
    }
    
    if (updateData.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(updateData.description);
      paramIndex++;
    }
    
    if (updateData.duration_minutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex}`);
      values.push(updateData.duration_minutes);
      paramIndex++;
    }
    
    if (updateData.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(updateData.price);
      paramIndex++;
    }
    
    if (updateData.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(updateData.category);
      paramIndex++;
    }
    
    if (updateData.image_url !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      values.push(updateData.image_url);
      paramIndex++;
    }
    
    if (updateData.active !== undefined) {
      updates.push(`active = $${paramIndex}`);
      values.push(updateData.active);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour',
      });
      return;
    }
    
    values.push(id);
    const result = await query<Service>(
      `UPDATE services SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Service mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du service:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du service',
    });
  }
};

/**
 * Supprime un service
 */
export const deleteService = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM services WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Service supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du service:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du service',
    });
  }
};
