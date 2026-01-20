export interface Store {
  id: string;
  name: string;
  workshop_capacity?: number;
  fitting_capacity?: number;
  opening_hours: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

export interface AvailabilityBlock {
  id?: string;
  store_id: string;
  technician_id?: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  block_type: 'closure' | 'maintenance' | 'holiday' | 'other' | 'recurring';
  service_type?: 'fitting' | 'workshop' | null;
  quantity?: number;
}

export interface AvailabilityBlockFormData {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  reason: string;
  block_type: 'closure' | 'maintenance' | 'holiday' | 'other';
  service_type: 'fitting' | 'workshop' | null;
  quantity: number;
  is_recurring: boolean;
  recurring_day: string;
}
