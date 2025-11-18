import { Request, Response } from 'express';
import { query } from '../db';
import { Admin, Booking, BookingWithDetails, BookingStats } from '../types';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Connexion admin
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const result = await query<Admin>(
      'SELECT * FROM admins WHERE email = $1 AND active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect',
      });
      return;
    }
    
    const admin = result.rows[0];
    const isValid = await verifyPassword(password, admin.password_hash);
    
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect',
      });
      return;
    }
    
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      store_id: admin.store_id,
    });
    
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          store_id: admin.store_id,
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion',
    });
  }
};

/**
 * Récupère toutes les réservations (pour dashboard admin)
 */
export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    
    let queryText = `
      SELECT 
        b.*,
        srv.name as service_name,
        srv.service_type as service_type,
        srv.price as service_price,
        srv.duration_minutes as service_duration,
        t.name as technician_name,
        st.name as store_name,
        st.address as store_address,
        st.postal_code as store_postal_code,
        st.city as store_city
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      JOIN stores st ON b.store_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      queryText += ` WHERE b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    queryText += ` ORDER BY b.start_datetime DESC`;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    params.push(limitNum, (pageNum - 1) * limitNum);
    
    const result = await query<BookingWithDetails>(queryText, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des réservations',
    });
  }
};

/**
 * Récupère les réservations d'un magasin
 */
export const getStoreBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { date, status, page = '1', limit = '50' } = req.query;
    
    let queryText = `
      SELECT 
        b.*,
        srv.name as service_name,
        srv.price as service_price,
        t.name as technician_name
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      WHERE b.store_id = $1
    `;
    
    const queryParams: any[] = [storeId];
    let paramIndex = 2;
    
    if (date) {
      queryText += ` AND DATE(b.start_datetime) = DATE($${paramIndex})`;
      queryParams.push(date);
      paramIndex++;
    }
    
    if (status) {
      queryText += ` AND b.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    queryText += ' ORDER BY b.start_datetime DESC';
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit as string), offset);
    
    const result = await query<BookingWithDetails>(queryText, queryParams);
    
    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM bookings WHERE store_id = $1';
    const countParams: any[] = [storeId];
    
    if (date) {
      countQuery += ' AND DATE(start_datetime) = DATE($2)';
      countParams.push(date);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        bookings: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          total_pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des réservations',
    });
  }
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateBookingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, internal_notes } = req.body;
    
    const result = await query<Booking>(
      `UPDATE bookings 
       SET status = $1, internal_notes = COALESCE($2, internal_notes)
       WHERE id = $3
       RETURNING *`,
      [status, internal_notes || null, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Statut mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut',
    });
  }
};

/**
 * Crée un blocage de disponibilité
 */
export const createAvailabilityBlock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { store_id, technician_id, start_datetime, end_datetime, reason } = req.body;
    
    const result = await query(
      `INSERT INTO availability_blocks (store_id, technician_id, start_datetime, end_datetime, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [store_id, technician_id || null, start_datetime, end_datetime, reason || null]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Blocage créé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du blocage:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du blocage',
    });
  }
};

/**
 * Supprime un blocage de disponibilité
 */
export const deleteAvailabilityBlock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM availability_blocks WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Blocage non trouvé',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Blocage supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du blocage:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du blocage',
    });
  }
};

/**
 * Récupère les statistiques d'un magasin
 */
export const getStoreStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { month } = req.query;
    
    let startDate, endDate;
    
    if (month) {
      const date = new Date(month as string);
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }
    
    const statsResult = await query<BookingStats>(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        COALESCE(SUM(srv.price) FILTER (WHERE b.status = 'completed'), 0) as total_revenue
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      WHERE b.store_id = $1
      AND b.start_datetime >= $2
      AND b.start_datetime <= $3`,
      [storeId, startDate, endDate]
    );
    
    const stats = statsResult.rows[0];
    
    // Calculer les taux
    const totalBookings = parseInt(stats.total_bookings as any);
    const noShow = parseInt(stats.no_show as any);
    const completed = parseInt(stats.completed as any);
    
    const fillRate = totalBookings > 0 ? (completed / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShow / totalBookings) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        ...stats,
        fill_rate: Math.round(fillRate * 100) / 100,
        no_show_rate: Math.round(noShowRate * 100) / 100,
        period: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
};
