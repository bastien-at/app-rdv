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
  has_workshop?: boolean;
  has_fitting?: boolean;
  workshop_capacity?: number;
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
  store_id: string | null;
  service_type: 'fitting' | 'workshop';
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  category?: string;
  image_url?: string;
  is_global: boolean;
  active: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  store_name?: string;
  store_city?: string;
}

export interface ServiceHistory {
  id: string;
  service_id: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  changed_fields?: Record<string, { old: any; new: any }>;
  changed_by?: string;
  changed_at: string;
  snapshot?: Service;
}

export interface CreateServiceData {
  store_id?: string;
  service_type: 'fitting' | 'workshop';
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  category?: string;
  image_url?: string;
  is_global?: boolean;
  active?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
  category?: string;
  image_url?: string;
  is_global?: boolean;
  active?: boolean;
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
  reception_report?: {
    workPerformed?: string;
    inspectionId?: string;
    // Add other fields if necessary
    [key: string]: any;
  };
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
  store_address?: string;
  store_postal_code?: string;
  store_city?: string;
  service_name?: string;
  service_price?: number;
  service_duration?: number;
  technician_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  store_id: string | null;
  role: 'super_admin' | 'store_admin';
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdminWithStore extends Admin {
  store: Store;
}

export interface CreateAdminData {
  email: string;
  name: string;
  store_id?: string;
  role: 'super_admin' | 'store_admin';
  active?: boolean;
  password?: string;
}

export interface UpdateAdminData {
  email?: string;
  name?: string;
  store_id?: string;
  role?: 'super_admin' | 'store_admin';
  active?: boolean;
  password?: string;
}

export interface CreateStoreData {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  opening_hours: OpeningHours;
  active?: boolean;
  has_workshop?: boolean;
  has_fitting?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Types pour l'annuaire des clients
export interface CustomerDirectory {
  id: string;
  store_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  first_booking_id?: string;
  total_bookings: number;
  last_booking_date?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  store_name?: string;
  store_city?: string;
}

export interface CreateCustomerData {
  store_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface UpdateCustomerData {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  notes?: string;
  active?: boolean;
}

export interface CustomerSearchResult {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  total_bookings: number;
  last_booking_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
