import { Request, Response } from 'express';
import { query } from '../db';
import { Store, Service, StoreWithServices } from '../types';

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
