import axios from 'axios';
import { Store, Service, TimeSlot, CreateBookingData, Booking, ApiResponse } from '../types';

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

export const getStoreServices = async (storeId: string): Promise<Service[]> => {
  const { data } = await api.get<ApiResponse<Service[]>>(`/stores/${storeId}/services`);
  return data.data || [];
};

// Availability
export const getAvailability = async (
  storeId: string,
  date: string,
  serviceId: string
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

export default api;
