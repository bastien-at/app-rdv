import { Request, Response } from 'express';
import { query, transaction } from '../db';
import { 
  CustomerDirectory, 
  CustomerDirectoryWithStore, 
  CreateCustomerData, 
  UpdateCustomerData,
  CustomerSearchResult,
  PaginatedResponse
} from '../types';

/**
 * Récupère tous les clients d'un magasin avec pagination
 */
export const getCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { store_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE cd.store_id = $1 AND cd.active = true';
    const queryParams: any[] = [store_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (
        LOWER(cd.firstname) ILIKE $${paramIndex} OR 
        LOWER(cd.lastname) ILIKE $${paramIndex} OR 
        LOWER(cd.email) ILIKE $${paramIndex} OR
        LOWER(cd.phone) ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    // Requête principale
    const customersQuery = `
      SELECT 
        cd.*,
        s.name as store_name,
        s.city as store_city
      FROM customer_directory cd
      LEFT JOIN stores s ON cd.store_id = s.id
      ${whereClause}
      ORDER BY cd.lastname ASC, cd.firstname ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    // Requête de comptage
    const countQuery = `
      SELECT COUNT(*) as total
      FROM customer_directory cd
      ${whereClause}
    `;

    const [customersResult, countResult] = await Promise.all([
      query<CustomerDirectoryWithStore>(customersQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Exclure limit et offset
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<CustomerDirectoryWithStore> = {
      data: customersResult.rows,
      total,
      page,
      limit,
      total_pages: totalPages
    };

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des clients'
    });
  }
};

/**
 * Recherche de clients pour autocomplétion
 */
export const searchCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { store_id } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      res.json({
        success: true,
        data: []
      });
      return;
    }

    const searchQuery = `
      SELECT 
        id,
        firstname,
        lastname,
        email,
        phone,
        total_bookings,
        last_booking_date
      FROM customer_directory
      WHERE store_id = $1 
        AND active = true
        AND (
          LOWER(firstname) ILIKE $2 OR 
          LOWER(lastname) ILIKE $2 OR 
          LOWER(email) ILIKE $2
        )
      ORDER BY 
        CASE 
          WHEN LOWER(email) ILIKE $2 THEN 1
          WHEN LOWER(firstname) ILIKE $2 THEN 2
          ELSE 3
        END,
        total_bookings DESC,
        lastname ASC,
        firstname ASC
      LIMIT 10
    `;

    const result = await query<CustomerSearchResult>(searchQuery, [
      store_id, 
      `${q.toLowerCase()}%`
    ]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la recherche de clients:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de clients'
    });
  }
};

/**
 * Crée un nouveau client dans l'annuaire
 */
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { store_id } = req.params;
    const customerData: CreateCustomerData = req.body;

    // Vérifier si le client existe déjà pour ce magasin
    const existingResult = await query(
      'SELECT id FROM customer_directory WHERE store_id = $1 AND email = $2',
      [store_id, customerData.email]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Un client avec cet email existe déjà dans ce magasin'
      });
      return;
    }

    const result = await query<CustomerDirectory>(
      `INSERT INTO customer_directory (
        store_id, firstname, lastname, email, phone, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        store_id,
        customerData.firstname,
        customerData.lastname,
        customerData.email,
        customerData.phone,
        customerData.notes || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Client ajouté à l\'annuaire avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du client'
    });
  }
};

/**
 * Met à jour un client existant
 */
export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateCustomerData = req.body;

    // Récupérer le client existant
    const existingResult = await query<CustomerDirectory>(
      'SELECT * FROM customer_directory WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
      return;
    }

    const existingCustomer = existingResult.rows[0];

    // Si changement d'email, vérifier l'unicité
    if (updates.email && updates.email !== existingCustomer.email) {
      const duplicateResult = await query(
        'SELECT id FROM customer_directory WHERE store_id = $1 AND email = $2 AND id != $3',
        [existingCustomer.store_id, updates.email, id]
      );

      if (duplicateResult.rows.length > 0) {
        res.status(409).json({
          success: false,
          error: 'Un client avec cet email existe déjà dans ce magasin'
        });
        return;
      }
    }

    // Construire la requête de mise à jour
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    const allowedFields = ['firstname', 'lastname', 'email', 'phone', 'notes', 'active'];

    for (const field of allowedFields) {
      if (updates[field as keyof UpdateCustomerData] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field as keyof UpdateCustomerData]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucune modification fournie'
      });
      return;
    }

    updateValues.push(id);

    const result = await query<CustomerDirectory>(
      `UPDATE customer_directory SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Client mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du client'
    });
  }
};

/**
 * Supprime (désactive) un client
 */
export const deleteCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query<CustomerDirectory>(
      'UPDATE customer_directory SET active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Client supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du client'
    });
  }
};

/**
 * Ajoute ou met à jour automatiquement un client lors d'une réservation
 */
export const upsertCustomerFromBooking = async (
  bookingId: string,
  storeId: string,
  firstname: string,
  lastname: string,
  email: string,
  phone: string
): Promise<CustomerDirectory> => {
  console.log(`[upsertCustomerFromBooking] Début pour ${email} (store: ${storeId})`);
  
  return await transaction(async (client) => {
    // Vérifier si le client existe déjà (insensible à la casse)
    const existingResult = await client.query<CustomerDirectory>(
      'SELECT * FROM customer_directory WHERE store_id = $1 AND LOWER(email) = LOWER($2)',
      [storeId, email]
    );

    if (existingResult.rows.length > 0) {
      console.log(`[upsertCustomerFromBooking] Client existant trouvé (ID: ${existingResult.rows[0].id})`);
      // Mettre à jour le client existant
      const customer = existingResult.rows[0];
      
      // Mettre à jour les informations si nécessaire
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (customer.firstname !== firstname) {
        updateFields.push(`firstname = $${paramIndex}`);
        updateValues.push(firstname);
        paramIndex++;
      }

      if (customer.lastname !== lastname) {
        updateFields.push(`lastname = $${paramIndex}`);
        updateValues.push(lastname);
        paramIndex++;
      }

      if (customer.phone !== phone) {
        updateFields.push(`phone = $${paramIndex}`);
        updateValues.push(phone);
        paramIndex++;
      }

      // Toujours mettre à jour les statistiques
      updateFields.push(`total_bookings = total_bookings + 1`);
      updateFields.push(`last_booking_date = NOW()`);
      
      updateValues.push(customer.id); // ID est le dernier paramètre

      // Construction de la requête
      const updateQuery = `UPDATE customer_directory SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      console.log(`[upsertCustomerFromBooking] Mise à jour du client: ${updateQuery}`);
      const result = await client.query<CustomerDirectory>(updateQuery, updateValues);
      return result.rows[0];
    } else {
      console.log(`[upsertCustomerFromBooking] Création d'un nouveau client`);
      // Créer un nouveau client
      const result = await client.query<CustomerDirectory>(
        `INSERT INTO customer_directory (
          store_id, firstname, lastname, email, phone, first_booking_id, 
          total_bookings, last_booking_date
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
        RETURNING *`,
        [storeId, firstname, lastname, email, phone, bookingId]
      );
      console.log(`[upsertCustomerFromBooking] Nouveau client créé (ID: ${result.rows[0].id})`);
      return result.rows[0];
    }
  });
};
