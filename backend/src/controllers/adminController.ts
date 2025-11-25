import { Request, Response } from 'express';
import { query } from '../db';
import {
  Admin,
  AdminWithStore,
  CreateAdminData,
  UpdateAdminData,
  Booking,
  BookingWithDetails,
  BookingStats,
} from '../types';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { format, startOfMonth, endOfMonth, addMinutes } from 'date-fns';
import { isSlotAvailable } from '../utils/availability';
import { sendConfirmationEmail } from '../utils/email';

/**
 * Connexion admin
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await query<Admin>(
      'SELECT * FROM admins WHERE email = $1 AND active = true',
      [email],
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
 * Met à jour une réservation côté admin (date, service, technicien) et la confirme
 */
export const adminUpdateAndConfirmBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { service_id, start_datetime, technician_id, internal_notes } = req.body;

    const existingResult = await query<Booking>(
      'SELECT * FROM bookings WHERE id = $1',
      [id],
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }

    const existingBooking = existingResult.rows[0];

    const newServiceId = service_id || existingBooking.service_id;

    const serviceResult = await query(
      'SELECT duration_minutes FROM services WHERE id = $1 AND store_id = $2 AND active = true',
      [newServiceId, existingBooking.store_id],
    );

    if (serviceResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Service invalide pour ce magasin',
      });
      return;
    }

    const service = serviceResult.rows[0] as { duration_minutes: number };

    const newStart = start_datetime
      ? new Date(start_datetime)
      : new Date(existingBooking.start_datetime as any);
    const newEnd = addMinutes(newStart, service.duration_minutes);

    const updateResult = await query<Booking>(
      `UPDATE bookings 
       SET service_id = $1,
           start_datetime = $2,
           end_datetime = $3,
           technician_id = COALESCE($4, technician_id),
           status = 'confirmed',
           internal_notes = COALESCE($5, internal_notes)
       WHERE id = $6
       RETURNING *`,
      [
        newServiceId,
        newStart,
        newEnd,
        technician_id || null,
        internal_notes || null,
        id,
      ],
    );

    const updated = updateResult.rows[0];

    const detailsResult = await query<BookingWithDetails>(
      `SELECT 
        b.*,
        srv.name as service_name,
        srv.service_type,
        srv.price as service_price,
        srv.duration_minutes as service_duration,
        st.name as store_name,
        st.address as store_address,
        st.city as store_city,
        st.postal_code as store_postal_code,
        t.name as technician_name
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      JOIN stores st ON b.store_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      WHERE b.id = $1`,
      [updated.id],
    );

    const bookingDetails = detailsResult.rows[0];

    sendConfirmationEmail(bookingDetails).catch((error) => {
      console.error("Erreur lors de l'envoi de l'email de confirmation:", error);
    });

    res.json({
      success: true,
      data: updated,
      message: 'Réservation mise à jour et confirmée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour/confirmation de la réservation:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour/confirmation de la réservation",
    });
  }
};

/**
 * Récupère toutes les réservations (pour dashboard admin)
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
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

    // Si l'utilisateur est un admin de magasin, restreindre au store_id associé
    const user = (req as any).user as { role?: string; store_id?: string } | undefined;
    if (user && user.role === 'store_admin' && user.store_id) {
      queryText += ` WHERE b.store_id = $${paramIndex}`;
      params.push(user.store_id);
      paramIndex++;
    }

    if (status && status !== 'all') {
      queryText += params.length === 0 ? ' WHERE' : ' AND';
      queryText += ` b.status = $${paramIndex}`;
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
  res: Response,
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
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, internal_notes } = req.body;

    const result = await query<Booking>(
      `UPDATE bookings 
       SET status = $1, internal_notes = COALESCE($2, internal_notes)
       WHERE id = $3
       RETURNING *`,
      [status, internal_notes || null, id],
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
 * Récupère les blocages de disponibilité d'un magasin
 */
export const getStoreAvailabilityBlocks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { storeId } = req.params;

    const result = await query(
      `SELECT * FROM availability_blocks 
       WHERE store_id = $1 
       ORDER BY start_datetime DESC`,
      [storeId],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des blocages:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des blocages',
    });
  }
};

/**
 * Crée un blocage de disponibilité
 */
export const createAvailabilityBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      store_id,
      technician_id,
      start_datetime,
      end_datetime,
      reason,
      block_type,
    } = req.body;

    const result = await query(
      `INSERT INTO availability_blocks (store_id, technician_id, start_datetime, end_datetime, reason, block_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        store_id,
        technician_id || null,
        start_datetime,
        end_datetime,
        reason || null,
        block_type || 'other',
      ],
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
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM availability_blocks WHERE id = $1 RETURNING *',
      [id],
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
  res: Response,
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
      [storeId, startDate, endDate],
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

/**
 * Récupère tous les administrateurs (super admin uniquement)
 */
export const getAllAdmins = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await query<AdminWithStore>(
      `SELECT 
        a.*,
        s.name as store_name,
        s.city as store_city
      FROM admins a
      LEFT JOIN stores s ON a.store_id = s.id
      ORDER BY a.created_at DESC`,
    );

    // Ne pas renvoyer les mots de passe
    const admins = result.rows.map((admin) => {
      const { password_hash, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });

    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des admins:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des administrateurs',
    });
  }
};

/**
 * Crée un nouvel administrateur (super admin uniquement)
 */
export const createAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, name, role, store_id }: CreateAdminData = req.body;

    // Vérifier si l'email existe déjà
    const existingAdmin = await query<Admin>(
      'SELECT id FROM admins WHERE email = $1',
      [email],
    );

    if (existingAdmin.rows.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Un administrateur avec cet email existe déjà',
      });
      return;
    }

    // Hasher le mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'admin
    const result = await query<Admin>(
      `INSERT INTO admins (email, password_hash, name, role, store_id, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [email, passwordHash, name, role, store_id || null],
    );

    const { password_hash, ...adminWithoutPassword } = result.rows[0];

    res.status(201).json({
      success: true,
      data: adminWithoutPassword,
      message: 'Administrateur créé avec succès',
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'admin:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'administrateur",
    });
  }
};

/**
 * Met à jour un administrateur (super admin uniquement)
 */
export const updateAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateAdminData = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(updateData.email);
      paramIndex++;
    }

    if (updateData.password) {
      const passwordHash = await hashPassword(updateData.password);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (updateData.name) {
      updates.push(`name = $${paramIndex}`);
      values.push(updateData.name);
      paramIndex++;
    }

    if (updateData.role) {
      updates.push(`role = $${paramIndex}`);
      values.push(updateData.role);
      paramIndex++;
    }

    if (updateData.store_id !== undefined) {
      updates.push(`store_id = $${paramIndex}`);
      values.push(updateData.store_id || null);
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
    const result = await query<Admin>(
      `UPDATE admins SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé',
      });
      return;
    }

    const { password_hash, ...adminWithoutPassword } = result.rows[0];

    res.json({
      success: true,
      data: adminWithoutPassword,
      message: 'Administrateur mis à jour avec succès',
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'admin:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour de l'administrateur",
    });
  }
};

/**
 * Supprime un administrateur (super admin uniquement)
 */
export const deleteAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM admins WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Administrateur supprimé avec succès',
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'admin:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression de l'administrateur",
    });
  }
};
