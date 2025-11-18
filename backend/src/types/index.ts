// Types pour les entités de la base de données

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
  created_at: Date;
  updated_at: Date;
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
  open: string;  // Format: "HH:mm"
  close: string; // Format: "HH:mm"
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
  created_at: Date;
  updated_at: Date;
}

export interface Technician {
  id: string;
  store_id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  booking_token: string;
  store_id: string;
  service_id: string;
  technician_id?: string;
  start_datetime: Date;
  end_datetime: Date;
  status: BookingStatus;
  customer_firstname: string;
  customer_lastname: string;
  customer_email: string;
  customer_phone: string;
  customer_data: CustomerData;
  internal_notes?: string;
  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface CustomerData {
  height?: number;
  weight?: number;
  shoe_size?: number;
  practice_frequency?: string;
  pain_description?: string;
  bike_info?: string;
  objectives?: string;
}

export interface AvailabilityBlock {
  id: string;
  store_id: string;
  technician_id?: string;
  start_datetime: Date;
  end_datetime: Date;
  reason?: string;
  created_at: Date;
}

export interface EmailLog {
  id: string;
  booking_id: string;
  type: EmailType;
  recipient_email: string;
  sent_at: Date;
  status: 'sent' | 'failed';
  error_message?: string;
}

export type EmailType = 'confirmation' | 'reminder_2days' | 'reminder_1day' | 'cancellation' | 'modification';

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  store_id?: string;
  role: 'super_admin' | 'store_admin';
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BookingLock {
  id: string;
  store_id: string;
  technician_id?: string;
  start_datetime: Date;
  end_datetime: Date;
  session_id: string;
  expires_at: Date;
  created_at: Date;
}

// Types pour les requêtes API

export interface CreateBookingRequest {
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

export interface UpdateBookingRequest {
  start_datetime?: string;
  customer_firstname?: string;
  customer_lastname?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_data?: CustomerData;
}

export interface AvailabilityQuery {
  date: string; // Format: YYYY-MM-DD
  service_id: string;
}

export interface TimeSlot {
  start_datetime: string;
  end_datetime: string;
  technician_id?: string;
  technician_name?: string;
  available: boolean;
}

export interface BookingWithDetails extends Booking {
  store_name?: string;
  service_name?: string;
  service_price?: number;
  technician_name?: string;
}

export interface StoreWithServices extends Store {
  services?: Service[];
}

export interface BookingStats {
  total_bookings: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  fill_rate: number;
  no_show_rate: number;
  total_revenue: number;
}

// Types pour les réponses API

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
