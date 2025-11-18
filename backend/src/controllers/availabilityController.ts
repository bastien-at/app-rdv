import { Request, Response } from 'express';
import { parse } from 'date-fns';
import { calculateAvailableSlots } from '../utils/availability';

/**
 * Récupère les créneaux disponibles pour un magasin et un service
 */
export const getAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { date, service_id } = req.query;
    
    // Parser la date
    const requestedDate = parse(date as string, 'yyyy-MM-dd', new Date());
    
    // Calculer les créneaux disponibles
    const slots = await calculateAvailableSlots(
      storeId,
      service_id as string,
      requestedDate
    );
    
    res.json({
      success: true,
      data: {
        date: date as string,
        store_id: storeId,
        service_id: service_id as string,
        slots,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors du calcul de disponibilité:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du calcul de disponibilité',
    });
  }
};
