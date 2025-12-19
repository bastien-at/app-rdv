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
  
  // 2. Récupérer les horaires d'ouverture pour ce jour
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
  
  // 5. Récupérer les réservations existantes avec leur type de service
  const bookingsResult = await query(
    `SELECT b.*, s.service_type 
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     WHERE b.store_id = $1 
     AND DATE(b.start_datetime) = DATE($2)
     AND b.status NOT IN ('cancelled')`,
    [storeId, date]
  );
  
  const existingBookings = bookingsResult.rows;
  
  // 6. Récupérer les blocages de disponibilité
  const blocksResult = await query<AvailabilityBlock & { service_type?: string }>(
    `SELECT * FROM availability_blocks 
     WHERE store_id = $1 
     AND DATE(start_datetime) <= DATE($2)
     AND DATE(end_datetime) >= DATE($2)`,
    [storeId, date]
  );
  
  const blocks = blocksResult.rows;
  
  // 7. Récupérer les locks actifs
  // Note: Les locks devraient idéalement aussi être liés au service_type, 
  // mais pour l'instant on va devoir récupérer le service associé au lock si possible
  // ou assumer que le lock bloque tout si on n'a pas l'info.
  // Cependant, les locks sont créés lors de la sélection d'un créneau pour un service donné.
  // On va améliorer la requête pour joindre avec les services via une sous-requête ou autre si possible,
  // mais booking_locks n'a pas forcément service_id directement ? 
  // Vérifions booking_locks table structure.
  // En attendant, on va filtrer les bookings et blocks par type.
  
  const locksResult = await query<BookingLock>(
    `SELECT * FROM booking_locks 
     WHERE store_id = $1 
     AND DATE(start_datetime) = DATE($2)
     AND expires_at > NOW()`,
    [storeId, date]
  );
  
  const locks = locksResult.rows;
  
  // 8. Filtrer les créneaux disponibles - VERSION AVEC CAPACITÉ PAR TYPE DE SERVICE
  const workshopCapacity = store.workshop_capacity || 1;
  const capacity = service.service_type === 'workshop' ? workshopCapacity : 1; // Pour le fitting, on garde 1 pour l'instant

  const availableSlots = allSlots.map(slot => {
    const slotStart = new Date(slot.start_datetime);
    const slotEnd = new Date(slot.end_datetime);
    const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes);
    
    // Compter les réservations concurrentes DU MÊME TYPE DE SERVICE
    const concurrentBookings = existingBookings.filter((booking: any) => {
      // Si le type de service est différent, on ne compte pas cette réservation
      if (booking.service_type !== service.service_type) {
        return false;
      }

      const bookingStart = new Date(booking.start_datetime);
      const bookingEnd = new Date(booking.end_datetime);
      
      return (
        slotStart < bookingEnd && slotEndWithBuffer > bookingStart
      );
    });
    
    // Vérifier si la capacité est atteinte pour ce type de service
    if (concurrentBookings.length >= capacity) {
      return { ...slot, available: false };
    }
    
    // Vérifier les blocages
    // Un blocage affecte le créneau si :
    // 1. Il n'a pas de service_type (blocage global du magasin)
    // 2. Il a le même service_type que le service demandé
    const hasBlockConflict = blocks.some((block: any) => {
      // Si le blocage est spécifique à un autre type de service, on l'ignore
      if (block.service_type && block.service_type !== service.service_type) {
        return false;
      }

      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);
      
      return (
        slotStart < blockEnd && slotEnd > blockStart
      );
    });
    
    if (hasBlockConflict) {
      return { ...slot, available: false };
    }
    
    // Vérifier les locks (traités comme des réservations en cours)
    const concurrentLocks = locks.filter((lock: any) => {
      // Si le lock a un type de service différent, on l'ignore
      if (lock.service_type && lock.service_type !== service.service_type) {
        return false;
      }

      const lockStart = new Date(lock.start_datetime);
      const lockEnd = new Date(lock.end_datetime);
      
      return (
        slotStart < lockEnd && slotEnd > lockStart
      );
    });
    
    // Capacité restante après réservations
    const remainingCapacity = capacity - concurrentBookings.length;
    
    // Si les locks dépassent la capacité restante
    if (concurrentLocks.length >= remainingCapacity) {
      return { ...slot, available: false };
    }
    
    return { ...slot, available: true };
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
  technicianId?: string,
  serviceType?: 'fitting' | 'workshop'
): Promise<void> => {
  const lockDuration = parseInt(process.env.BOOKING_LOCK_MINUTES || '10');
  const expiresAt = addMinutes(new Date(), lockDuration);
  
  await query(
    `INSERT INTO booking_locks (store_id, technician_id, start_datetime, end_datetime, session_id, expires_at, service_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [storeId, technicianId || null, startDatetime, endDatetime, sessionId, expiresAt, serviceType || null]
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
  
  // Chercher un créneau qui correspond (avec une tolérance de 1 minute)
  const requestedTime = startDatetime.getTime();
  const requestedSlot = slots.find(slot => {
    const slotTime = new Date(slot.start_datetime).getTime();
    const timeDiff = Math.abs(slotTime - requestedTime);
    return timeDiff < 60000; // Moins d'une minute de différence
  });
  
  return requestedSlot?.available || false;
};
