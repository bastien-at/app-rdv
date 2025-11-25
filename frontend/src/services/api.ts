import axios from 'axios';
import { 
  Store, 
  Service, 
  TimeSlot, 
  Booking, 
  CreateBookingData, 
  CreateServiceData,
  UpdateServiceData,
  ServiceHistory,
  ApiResponse,
  AdminWithStore,
  CreateAdminData,
  UpdateAdminData,
  CreateStoreData 
} from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Stores
export const getStores = async (): Promise<Store[]> => {
  const { data } = await api.get<ApiResponse<Store[]>>('/stores');
  return data.data || [];
};

export const getStoreById = async (id: string): Promise<Store> => {
  const { data } = await api.get<ApiResponse<Store>>(`/stores/${id}`);
  return data.data!;
};

export const getStoreBySlug = async (slug: string): Promise<Store> => {
  const { data } = await api.get<ApiResponse<Store>>(`/stores/by-slug/${slug}`);
  return data.data!;
};

export const createStore = async (storeData: CreateStoreData): Promise<Store> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.post<ApiResponse<Store>>('/admin/stores', storeData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const getStoreServices = async (storeId: string): Promise<Service[]> => {
  const { data } = await api.get<ApiResponse<Service[]>>(`/stores/${storeId}/services`);
  return data.data || [];
};

// Availability
export const getAvailability = async (
  storeId: string,
  serviceId: string,
  date: string
): Promise<TimeSlot[]> => {
  const { data } = await api.get<ApiResponse<{ slots: TimeSlot[] }>>(
    `/stores/${storeId}/availability`,
    { params: { date, service_id: serviceId } }
  );
  return data.data?.slots || [];
};

// Bookings
export const createBooking = async (bookingData: CreateBookingData): Promise<Booking> => {
  const { data } = await api.post<ApiResponse<Booking>>('/bookings', bookingData);
  return data.data!;
};

export const getBookingByToken = async (token: string): Promise<Booking> => {
  const { data } = await api.get<ApiResponse<Booking>>(`/bookings/${token}`);
  return data.data!;
};

export const cancelBooking = async (token: string, reason?: string): Promise<void> => {
  await api.delete(`/bookings/${token}`, { data: { cancellation_reason: reason } });
};

// Admin
export const adminLogin = async (email: string, password: string): Promise<string> => {
  const { data } = await api.post<ApiResponse<{ token: string }>>('/admin/login', {
    email,
    password,
  });
  return data.data!.token;
};

export const getAllBookings = async (): Promise<Booking[]> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.get<ApiResponse<Booking[]>>('/admin/bookings', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data || [];
};

export interface AdminConfirmBookingPayload {
  service_id?: string;
  start_datetime?: string;
  technician_id?: string;
  internal_notes?: string;
}

export const adminConfirmBooking = async (
  id: string,
  payload: AdminConfirmBookingPayload = {},
): Promise<Booking> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.put<ApiResponse<Booking>>(
    `/admin/bookings/${id}/confirm`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data.data!;
};

// Services Management
export const getAllServices = async (params?: {
  store_id?: string;
  service_type?: 'fitting' | 'workshop';
  category?: string;
  active?: boolean;
}): Promise<Service[]> => {
  const { data } = await api.get<ApiResponse<Service[]>>('/services', { params });
  return data.data || [];
};

export const getServiceById = async (id: string): Promise<Service> => {
  const { data } = await api.get<ApiResponse<Service>>(`/services/${id}`);
  return data.data!;
};

export const createService = async (serviceData: CreateServiceData): Promise<Service> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.post<ApiResponse<Service>>('/services', serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const updateService = async (id: string, serviceData: UpdateServiceData): Promise<Service> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.put<ApiResponse<Service>>(`/services/${id}`, serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const deleteService = async (id: string): Promise<void> => {
  const token = localStorage.getItem('admin_token');
  await api.delete(`/services/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getServiceHistory = async (id: string): Promise<ServiceHistory[]> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.get<ApiResponse<ServiceHistory[]>>(`/services/${id}/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data || [];
};

export const getServiceCategories = async (): Promise<string[]> => {
  const { data} = await api.get<ApiResponse<string[]>>('/services/categories/list');
  return data.data || [];
};

// Admin management (super admin only)
export const getAdmins = async (): Promise<AdminWithStore[]> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.get<ApiResponse<AdminWithStore[]>>('/admin/admins', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data || [];
};

export const createAdmin = async (adminData: CreateAdminData): Promise<AdminWithStore> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.post<ApiResponse<AdminWithStore>>('/admin/admins', adminData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const updateAdmin = async (id: string, adminData: UpdateAdminData): Promise<AdminWithStore> => {
  const token = localStorage.getItem('admin_token');
  const { data } = await api.put<ApiResponse<AdminWithStore>>(`/admin/admins/${id}`, adminData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const deleteAdminApi = async (id: string): Promise<void> => {
  const token = localStorage.getItem('admin_token');
  await api.delete(`/admin/admins/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export default api;
