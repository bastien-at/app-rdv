export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  latitude?: number;
  longitude?: number;
  opening_hours: OpeningHours;
  active: boolean;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface Service {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

export interface TimeSlot {
  start_datetime: string;
  end_datetime: string;
  technician_id?: string;
  technician_name?: string;
  available: boolean;
}

export interface CreateBookingData {
  store_id: string;
  service_id: string;
  technician_id?: string;
  start_datetime: string;
  customer_firstname: string;
  customer_lastname: string;
  customer_email: string;
  customer_phone: string;
  customer_data: CustomerData;
}

export interface CustomerData {
  height?: number;
  weight?: number;
  shoe_size?: number;
  practice_frequency?: string;
  pain_description?: string;
  bike_info?: string;
  objectives?: string;
}

export interface Booking {
  id: string;
  booking_token: string;
  store_id: string;
  service_id: string;
  technician_id?: string;
  start_datetime: string;
  end_datetime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  customer_firstname: string;
  customer_lastname: string;
  customer_email: string;
  customer_phone: string;
  customer_data: CustomerData;
  store_name?: string;
  service_name?: string;
  service_price?: number;
  technician_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
