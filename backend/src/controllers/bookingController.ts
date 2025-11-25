import { Request, Response } from 'express';
import { query, transaction } from '../db';
import { Booking, BookingWithDetails, Service, Store } from '../types';
import { generateBookingToken } from '../utils/auth';
import { isSlotAvailable, createBookingLock, removeBookingLock } from '../utils/availability';
import { sendConfirmationEmail, sendCancellationEmail } from '../utils/email';
import { addMinutes } from 'date-fns';

/**
 * Recherche les réservations par email
 */
export const searchBookingsByEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Email requis',
      });
      return;
    }

    const result = await query(
      `SELECT 
        b.id,
        b.booking_date,
        b.start_time,
        b.status,
        b.customer_first_name,
        b.customer_last_name,
        b.customer_email,
        b.customer_phone,
        srv.name as service_name,
        srv.service_type,
        srv.duration_minutes as service_duration,
        srv.price as service_price,
        st.name as store_name,
        st.address as store_address,
        st.city as store_city,
        st.postal_code as store_postal_code,
        t.name as technician_name
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      JOIN stores st ON b.store_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      WHERE LOWER(b.customer_email) = LOWER($1)
      ORDER BY b.booking_date DESC, b.start_time DESC`,
      [email]
    );

    res.json({
      success: true,
      bookings: result.rows,
    });
  } catch (error) {
    console.error('Error searching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche des réservations',
    });
  }
};

/**
 * Crée une nouvelle réservation
 */
export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      store_id,
      service_id,
      technician_id,
      start_datetime,
      customer_firstname,
      customer_lastname,
      customer_email,
      customer_phone,
      customer_data,
    } = req.body;
    
    const startDate = new Date(start_datetime);
    
    // Récupérer les informations du service pour calculer la durée
    const serviceResult = await query<Service>(
      'SELECT * FROM services WHERE id = $1 AND store_id = $2 AND active = true',
      [service_id, store_id]
    );
    
    if (serviceResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service non trouvé',
      });
      return;
    }
    
    const service = serviceResult.rows[0];
    const endDate = addMinutes(startDate, service.duration_minutes);
    
    // Vérifier la disponibilité du créneau
    const available = await isSlotAvailable(store_id, service_id, startDate);
    
    if (!available) {
      res.status(409).json({
        success: false,
        error: 'Ce créneau n\'est plus disponible',
      });
      return;
    }
    
    // Créer la réservation dans une transaction
    const booking = await transaction(async (client) => {
      // Générer un token unique
      const bookingToken = generateBookingToken();
      
      // Insérer la réservation
      const result = await client.query<Booking>(
        `INSERT INTO bookings (
          booking_token, store_id, service_id, technician_id,
          start_datetime, end_datetime, status,
          customer_firstname, customer_lastname, customer_email, customer_phone,
          customer_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          bookingToken,
          store_id,
          service_id,
          technician_id || null,
          startDate,
          endDate,
          'pending',
          customer_firstname,
          customer_lastname,
          customer_email,
          customer_phone,
          JSON.stringify(customer_data || {}),
        ]
      );
      
      return result.rows[0];
    });
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Demande de réservation créée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la création de la réservation',
    });
  }
};

/**
 * Récupère une réservation par son token
 */
export const getBookingByToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    
    const result = await query<Booking>(
      'SELECT * FROM bookings WHERE booking_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }
    
    const booking = result.rows[0];
    const bookingDetails = await getBookingDetails(booking.id);
    
    res.json({
      success: true,
      data: bookingDetails,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la réservation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la réservation',
    });
  }
};

/**
 * Met à jour une réservation
 */
export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    const updates = req.body;
    
    // Récupérer la réservation existante
    const existingResult = await query<Booking>(
      'SELECT * FROM bookings WHERE booking_token = $1',
      [token]
    );
    
    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée',
      });
      return;
    }
    
    const existingBooking = existingResult.rows[0];
    
    // Ne pas permettre de modifier une réservation annulée ou terminée
    if (['cancelled', 'completed'].includes(existingBooking.status)) {
      res.status(400).json({
        success: false,
        error: 'Cette réservation ne peut plus être modifiée',
      });
      return;
    }
    
    // Si changement de date, vérifier la disponibilité
    if (updates.start_datetime) {
      const newStartDate = new Date(updates.start_datetime);
      const available = await isSlotAvailable(
        existingBooking.store_id,
        existingBooking.service_id,
        newStartDate
      );
      
      if (!available) {
        res.status(409).json({
          success: false,
          error: 'Ce créneau n\'est plus disponible',
        });
        return;
      }
      
      // Calculer la nouvelle date de fin
      const serviceResult = await query<Service>(
        'SELECT duration_minutes FROM services WHERE id = $1',
        [existingBooking.service_id]
      );
      const service = serviceResult.rows[0];
      updates.end_datetime = addMinutes(newStartDate, service.duration_minutes);
    }
    
    // Construire la requête de mise à jour
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'start_datetime',
      'end_datetime',
      'customer_firstname',
      'customer_lastname',
      'customer_email',
      'customer_phone',
      'customer_data',
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(
          field === 'customer_data' ? JSON.stringify(updates[field]) : updates[field]
        );
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucune modification fournie',
      });
      return;
    }
    
    updateValues.push(token);
    
    const result = await query<Booking>(
      `UPDATE bookings SET ${updateFields.join(', ')} WHERE booking_token = $${paramIndex} RETURNING *`,
      updateValues
    );
    
    const updatedBooking = result.rows[0];
    const bookingDetails = await getBookingDetails(updatedBooking.id);
    
    res.json({
      success: true,
      data: bookingDetails,
      message: 'Réservation mise à jour avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la mise à jour de la réservation',
    });
  }
};

/**
 * Annule une réservation
 */
export const cancelBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    const { cancellation_reason } = req.body;
    
    const result = await query<Booking>(
      `UPDATE bookings 
       SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
       WHERE booking_token = $2 AND status NOT IN ('cancelled', 'completed')
       RETURNING *`,
      [cancellation_reason || null, token]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Réservation non trouvée ou déjà annulée/terminée',
      });
      return;
    }
    
    const booking = result.rows[0];
    
    // Récupérer les détails complets pour l'email
    const bookingDetailsResult = await query<BookingWithDetails>(
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
      [booking.id]
    );
    
    const bookingDetails = bookingDetailsResult.rows[0];
    
    // Envoyer l'email d'annulation
    sendCancellationEmail(bookingDetails).catch((error) => {
      console.error('Erreur lors de l\'envoi de l\'email d\'annulation:', error);
    });
    
    res.json({
      success: true,
      data: booking,
      message: 'Réservation annulée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la réservation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'annulation de la réservation',
    });
  }
};

/**
 * Fonction utilitaire pour récupérer les détails complets d'une réservation
 */
async function getBookingDetails(bookingId: string): Promise<BookingWithDetails> {
  const result = await query<BookingWithDetails>(
    `SELECT 
      b.*,
      s.name as store_name,
      srv.name as service_name,
      srv.price as service_price,
      t.name as technician_name
    FROM bookings b
    JOIN stores s ON b.store_id = s.id
    JOIN services srv ON b.service_id = srv.id
    LEFT JOIN technicians t ON b.technician_id = t.id
    WHERE b.id = $1`,
    [bookingId]
  );
  
  return result.rows[0];
}
