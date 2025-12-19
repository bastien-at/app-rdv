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
  CreateStoreData,
  CustomerDirectory,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerSearchResult,
  PaginatedResponse
} from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
};

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
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<Store>>('/admin/stores', storeData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const updateStore = async (id: string, storeData: Partial<CreateStoreData>): Promise<Store> => {
  const token = getAdminToken();
  const { data } = await api.put<ApiResponse<Store>>(`/admin/stores/${id}`, storeData, {
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
  const token = getAdminToken();
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
  duration?: number;
}

export const adminConfirmBooking = async (
  id: string,
  payload: AdminConfirmBookingPayload = {},
): Promise<Booking> => {
  const token = getAdminToken();
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

// Etat des lieux (réception)
export const saveReceptionReport = async (
  bookingId: string,
  report: any,
): Promise<void> => {
  const token = getAdminToken();
  await api.post(`/admin/bookings/${bookingId}/reception-report`, report, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Inspection (état des lieux) détaillée
export const createOrUpdateInspectionApi = async (
  bookingId: string,
  comments: string,
): Promise<any> => {
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<any>>(
    `/bookings/${bookingId}/inspection`,
    { comments },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data.data;
};

export const uploadInspectionPhotosApi = async (
  inspectionId: string,
  files: File[],
): Promise<void> => {
  if (files.length === 0) return;
  const token = getAdminToken();
  const formData = new FormData();
  files.slice(0, 5).forEach((file) => {
    formData.append('photos', file);
  });

  await api.post(`/inspections/${inspectionId}/photos`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const sendInspectionApi = async (inspectionId: string): Promise<void> => {
  const token = getAdminToken();
  await api.post(`/inspections/${inspectionId}/send`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getInspectionByBookingApi = async (bookingId: string): Promise<any | null> => {
  const token = getAdminToken();
  try {
    const { data } = await api.get<ApiResponse<any>>(`/bookings/${bookingId}/inspection`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    return data.data || null;
  } catch (error: any) {
    // 404 = aucune inspection encore créée, ce n'est pas bloquant
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export interface ReceptionReportPayload {
  inspectionId?: string;
  technicianId?: string;
  workPerformed?: string;
  partsReplaced?: string;
  recommendations?: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
}

export const createOrUpdateReceptionReportApi = async (
  bookingId: string,
  payload: ReceptionReportPayload,
): Promise<any> => {
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<any>>(
    `/bookings/${bookingId}/reception-report`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data.data;
};

export const sendReceptionReportApi = async (reportId: string): Promise<void> => {
  const token = getAdminToken();
  await api.post(`/reception-reports/${reportId}/send`, { sent: true }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
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
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<Service>>('/services', serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const updateService = async (id: string, serviceData: UpdateServiceData): Promise<Service> => {
  const token = getAdminToken();
  const { data } = await api.put<ApiResponse<Service>>(`/services/${id}`, serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const deleteService = async (id: string): Promise<void> => {
  const token = getAdminToken();
  await api.delete(`/services/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getServiceHistory = async (id: string): Promise<ServiceHistory[]> => {
  const token = getAdminToken();
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
  const token = getAdminToken();
  const { data } = await api.get<ApiResponse<AdminWithStore[]>>('/admin/admins', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data || [];
};

export const createAdmin = async (adminData: CreateAdminData): Promise<AdminWithStore> => {
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<AdminWithStore>>('/admin/admins', adminData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const updateAdmin = async (id: string, adminData: UpdateAdminData): Promise<AdminWithStore> => {
  const token = getAdminToken();
  const { data } = await api.put<ApiResponse<AdminWithStore>>(`/admin/admins/${id}`, adminData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.data!;
};

export const deleteAdminApi = async (id: string): Promise<void> => {
  const token = getAdminToken();
  await api.delete(`/admin/admins/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Customer Directory API
export const getCustomers = async (
  storeId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
  }
): Promise<PaginatedResponse<CustomerDirectory>> => {
  const token = getAdminToken();
  const response = await api.get<any>(
    `/stores/${storeId}/customers`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params
    }
  );
  
  // Le backend renvoie une structure plate { success, data, total, page, ... }
  // Nous devons retourner un objet PaginatedResponse { data, total, page, ... }
  return {
    data: response.data.data || [],
    total: response.data.total || 0,
    page: response.data.page || 1,
    limit: response.data.limit || 20,
    total_pages: response.data.total_pages || 0
  };
};

export const searchCustomers = async (
  storeId: string,
  query: string
): Promise<CustomerSearchResult[]> => {
  const token = getAdminToken();
  const { data } = await api.get<ApiResponse<CustomerSearchResult[]>>(
    `/stores/${storeId}/customers/search`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { q: query }
    }
  );
  return data.data || [];
};

export const createCustomer = async (
  storeId: string,
  customerData: CreateCustomerData
): Promise<CustomerDirectory> => {
  const token = getAdminToken();
  const { data } = await api.post<ApiResponse<CustomerDirectory>>(
    `/stores/${storeId}/customers`,
    customerData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data.data!;
};

export const updateCustomer = async (
  id: string,
  customerData: UpdateCustomerData
): Promise<CustomerDirectory> => {
  const token = getAdminToken();
  const { data } = await api.put<ApiResponse<CustomerDirectory>>(
    `/customers/${id}`,
    customerData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data.data!;
};

export const deleteCustomer = async (id: string): Promise<CustomerDirectory> => {
  const token = getAdminToken();
  const { data } = await api.delete<ApiResponse<CustomerDirectory>>(
    `/customers/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data.data!;
};

// Password Management
export const forgotPassword = async (email: string): Promise<void> => {
  await api.post('/admin/forgot-password', { email });
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
  await api.post(`/admin/reset-password/${token}`, { password });
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const token = getAdminToken();
  await api.put(
    '/admin/change-password',
    { currentPassword, newPassword },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export default api;
