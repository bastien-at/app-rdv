import { addMinutes, format, parse, isWithinInterval, isBefore, isAfter, addDays, addMonths } from 'date-fns';
import { query } from '../db';
import { Store, Service, Booking, AvailabilityBlock, BookingLock, TimeSlot, DaySchedule } from '../types';

/**
 * Calcule les créneaux disponibles pour un magasin et un service donné
 */
export const calculateAvailableSlots = async (
  storeId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> => {
  // 1. Récupérer les informations du magasin et du service
  const storeResult = await query<Store>(
    'SELECT * FROM stores WHERE id = $1 AND active = true',
    [storeId]
  );
  
  if (storeResult.rows.length === 0) {
    throw new Error('Magasin non trouvé');
  }
  
  const store = storeResult.rows[0];
  
  const serviceResult = await query<Service>(
    'SELECT * FROM services WHERE id = $1 AND store_id = $2 AND active = true',
    [serviceId, storeId]
  );
  
  if (serviceResult.rows.length === 0) {
    throw new Error('Service non trouvé');
  }
  
  const service = serviceResult.rows[0];
  
  // 2. Vérifier les contraintes de réservation
  const now = new Date();
  const minBookingDate = addDays(now, parseInt(process.env.MIN_BOOKING_HOURS || '48') / 24);
  const maxBookingDate = addMonths(now, parseInt(process.env.MAX_BOOKING_MONTHS || '3'));
  
  if (isBefore(date, minBookingDate)) {
    return []; // Trop tôt pour réserver
  }
  
  if (isAfter(date, maxBookingDate)) {
    return []; // Trop tard pour réserver
  }
  
  // 3. Récupérer les horaires d'ouverture pour ce jour
  const dayName = format(date, 'EEEE').toLowerCase() as keyof typeof store.opening_hours;
  const daySchedule: DaySchedule = store.opening_hours[dayName];
  
  if (!daySchedule || daySchedule.closed) {
    return []; // Magasin fermé ce jour
  }
  
  // 4. Générer tous les créneaux possibles
  const openTime = parse(daySchedule.open, 'HH:mm', date);
  const closeTime = parse(daySchedule.close, 'HH:mm', date);
  const bufferMinutes = parseInt(process.env.BUFFER_MINUTES || '15');
  const slotDuration = service.duration_minutes + bufferMinutes;
  
  const allSlots: TimeSlot[] = [];
  let currentTime = openTime;
  
  while (addMinutes(currentTime, service.duration_minutes) <= closeTime) {
    const slotEnd = addMinutes(currentTime, service.duration_minutes);
    
    allSlots.push({
      start_datetime: currentTime.toISOString(),
      end_datetime: slotEnd.toISOString(),
      available: true,
    });
    
    currentTime = addMinutes(currentTime, 30); // Créneaux toutes les 30 minutes
  }
  
  // 5. Récupérer les réservations existantes
  const bookingsResult = await query<Booking>(
    `SELECT * FROM bookings 
     WHERE store_id = $1 
     AND DATE(start_datetime) = DATE($2)
     AND status NOT IN ('cancelled')`,
    [storeId, date]
  );
  
  const existingBookings = bookingsResult.rows;
  
  // 6. Récupérer les blocages de disponibilité
  const blocksResult = await query<AvailabilityBlock>(
    `SELECT * FROM availability_blocks 
     WHERE store_id = $1 
     AND DATE(start_datetime) <= DATE($2)
     AND DATE(end_datetime) >= DATE($2)`,
    [storeId, date]
  );
  
  const blocks = blocksResult.rows;
  
  // 7. Récupérer les locks actifs
  const locksResult = await query<BookingLock>(
    `SELECT * FROM booking_locks 
     WHERE store_id = $1 
     AND DATE(start_datetime) = DATE($2)
     AND expires_at > NOW()`,
    [storeId, date]
  );
  
  const locks = locksResult.rows;
  
  // 8. Filtrer les créneaux disponibles
  const availableSlots = allSlots.map(slot => {
    const slotStart = new Date(slot.start_datetime);
    const slotEnd = new Date(slot.end_datetime);
    const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes);
    
    // Vérifier si le créneau est dans le passé
    if (isBefore(slotStart, now)) {
      return { ...slot, available: false };
    }
    
    // Vérifier les réservations existantes
    const hasBookingConflict = existingBookings.filter((booking: any) => {
      const bookingStart = new Date(booking.start_datetime);
      const bookingEnd = addMinutes(new Date(booking.end_datetime), bufferMinutes);
      
      return (
        isWithinInterval(slotStart, { start: bookingStart, end: bookingEnd }) ||
        isWithinInterval(slotEnd, { start: bookingStart, end: bookingEnd }) ||
        isWithinInterval(bookingStart, { start: slotStart, end: slotEndWithBuffer })
      );
    }).length > 0;
    
    if (hasBookingConflict) {
      return { ...slot, available: false };
    }
    
    // Vérifier les blocages
    const hasBlockConflict = blocks.filter((block: any) => {
      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);
      
      return (
        isWithinInterval(slotStart, { start: blockStart, end: blockEnd }) ||
        isWithinInterval(slotEnd, { start: blockStart, end: blockEnd })
      );
    }).length > 0;
    
    if (hasBlockConflict) {
      return { ...slot, available: false };
    }
    
    // Vérifier les locks
    const hasLockConflict = locks.filter((lock: any) => {
      const lockStart = new Date(lock.start_datetime);
      const lockEnd = new Date(lock.end_datetime);
      
      return (
        isWithinInterval(slotStart, { start: lockStart, end: lockEnd }) ||
        isWithinInterval(slotEnd, { start: lockStart, end: lockEnd })
      );
    });
    
    if (hasLockConflict) {
      return { ...slot, available: false };
    }
    
    return slot;
  });
  
  return availableSlots;
};

/**
 * Crée un lock temporaire sur un créneau
 */
export const createBookingLock = async (
  storeId: string,
  startDatetime: Date,
  endDatetime: Date,
  sessionId: string,
  technicianId?: string
): Promise<void> => {
  const lockDuration = parseInt(process.env.BOOKING_LOCK_MINUTES || '10');
  const expiresAt = addMinutes(new Date(), lockDuration);
  
  await query(
    `INSERT INTO booking_locks (store_id, technician_id, start_datetime, end_datetime, session_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [storeId, technicianId || null, startDatetime, endDatetime, sessionId, expiresAt]
  );
};

/**
 * Supprime un lock
 */
export const removeBookingLock = async (sessionId: string): Promise<void> => {
  await query('DELETE FROM booking_locks WHERE session_id = $1', [sessionId]);
};

/**
 * Vérifie si un créneau est disponible
 */
export const isSlotAvailable = async (
  storeId: string,
  serviceId: string,
  startDatetime: Date
): Promise<boolean> => {
  const slots = await calculateAvailableSlots(storeId, serviceId, startDatetime);
  const requestedSlot = slots.find(slot => 
    new Date(slot.start_datetime).getTime() === startDatetime.getTime()
  );
  
  return requestedSlot?.available || false;
};
