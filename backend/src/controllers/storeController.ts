import { Request, Response } from 'express';
import { query } from '../db';
import { Store, Service, StoreWithServices, CreateStoreData, UpdateStoreData } from '../types';

/**
 * Récupère tous les magasins actifs
 */
export const getAllStores = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await query<Store>(
      'SELECT * FROM stores WHERE active = true ORDER BY city, name'
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des magasins:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des magasins',
    });
  }
};

/**
 * Récupère un magasin par slug (nom de ville)
 */
export const getStoreBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Recherche simple par ville (insensible à la casse)
    const result = await query<Store>(
      `SELECT * FROM stores 
       WHERE LOWER(city) = LOWER($1)
       AND active = true`,
      [slug]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du magasin par slug:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du magasin',
    });
  }
};

/**
 * Récupère un magasin par ID
 */
export const getStoreById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query<Store>(
      'SELECT * FROM stores WHERE id = $1 AND active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du magasin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du magasin',
    });
  }
};

/**
 * Récupère les services d'un magasin
 */
export const getStoreServices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Vérifier que le magasin existe
    const storeResult = await query<Store>(
      'SELECT * FROM stores WHERE id = $1 AND active = true',
      [id]
    );
    
    if (storeResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    // Récupérer les services
    const servicesResult = await query<Service>(
      'SELECT * FROM services WHERE store_id = $1 AND active = true ORDER BY price',
      [id]
    );
    
    res.json({
      success: true,
      data: servicesResult.rows,
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
 * Récupère un magasin avec ses services
 */
export const getStoreWithServices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const storeResult = await query<Store>(
      'SELECT * FROM stores WHERE id = $1 AND active = true',
      [id]
    );
    
    if (storeResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    const servicesResult = await query<Service>(
      'SELECT * FROM services WHERE store_id = $1 AND active = true ORDER BY price',
      [id]
    );
    
    const storeWithServices: StoreWithServices = {
      ...storeResult.rows[0],
      services: servicesResult.rows,
    };
    
    res.json({
      success: true,
      data: storeWithServices,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du magasin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du magasin',
    });
  }
};

/**
 * Crée un nouveau magasin (super admin uniquement)
 */
export const createStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeData: CreateStoreData = req.body;
    
    const result = await query<Store>(
      `INSERT INTO stores (
        name, address, city, postal_code, phone, email,
        latitude, longitude, opening_hours, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        storeData.name,
        storeData.address,
        storeData.city,
        storeData.postal_code,
        storeData.phone,
        storeData.email,
        storeData.latitude || null,
        storeData.longitude || null,
        JSON.stringify(storeData.opening_hours),
        storeData.active !== false,
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Magasin créé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du magasin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du magasin',
    });
  }
};

/**
 * Met à jour un magasin (super admin uniquement)
 */
export const updateStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateStoreData = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updateData.name) {
      updates.push(`name = $${paramIndex}`);
      values.push(updateData.name);
      paramIndex++;
    }
    
    if (updateData.address) {
      updates.push(`address = $${paramIndex}`);
      values.push(updateData.address);
      paramIndex++;
    }
    
    if (updateData.city) {
      updates.push(`city = $${paramIndex}`);
      values.push(updateData.city);
      paramIndex++;
    }
    
    if (updateData.postal_code) {
      updates.push(`postal_code = $${paramIndex}`);
      values.push(updateData.postal_code);
      paramIndex++;
    }
    
    if (updateData.phone) {
      updates.push(`phone = $${paramIndex}`);
      values.push(updateData.phone);
      paramIndex++;
    }
    
    if (updateData.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(updateData.email);
      paramIndex++;
    }
    
    if (updateData.latitude !== undefined) {
      updates.push(`latitude = $${paramIndex}`);
      values.push(updateData.latitude);
      paramIndex++;
    }
    
    if (updateData.longitude !== undefined) {
      updates.push(`longitude = $${paramIndex}`);
      values.push(updateData.longitude);
      paramIndex++;
    }
    
    if (updateData.opening_hours) {
      updates.push(`opening_hours = $${paramIndex}`);
      values.push(JSON.stringify(updateData.opening_hours));
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
    const result = await query<Store>(
      `UPDATE stores SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Magasin mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du magasin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du magasin',
    });
  }
};

/**
 * Supprime un magasin (super admin uniquement)
 */
export const deleteStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM stores WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Magasin non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Magasin supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du magasin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du magasin',
    });
  }
};
