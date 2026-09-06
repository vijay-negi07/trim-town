import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/token/refresh', { refreshToken });
          setTokens(res.data.data.accessToken, res.data.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return axios(error.config);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH STORE ───────────────────────────────────────────────────────────────

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; name: string; phone: string; role: string } | null;
  setAuth: (data: { accessToken: string; refreshToken: string; user: any }) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        window.location.href = '/login';
      },
    }),
    { name: 'trimtown-admin-auth' }
  )
);

// ─── API HELPERS ─────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/otp/verify', { phone, otp, role: 'ADMIN' }),
  logout: () => api.post('/auth/logout'),
};

export const statsApi = {
  getPlatformStats: () => api.get('/admin/stats'),
  getSalons: (params?: any) => api.get('/admin/salons', { params }),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  verifySalon: (salonId: string, status: string) =>
    api.patch(`/admin/salons/${salonId}/verify`, { status }),
  moderateReview: (reviewId: string, isPublished: boolean) =>
    api.patch(`/admin/reviews/${reviewId}`, { isPublished }),
};

export const salonApi = {
  getNearby: (params: any) => api.get('/salons/nearby', { params }),
  getById: (id: string) => api.get(`/salons/${id}`),
  getSalonReviews: (id: string) => api.get(`/salons/${id}/reviews`),
};

export const queueApi = {
  getAvailability: (barberId: string) => api.get(`/queue/barber/${barberId}`),
  updateStatus: (barberId: string, status: string) =>
    api.put(`/queue/barber/${barberId}/status`, { status }),
  markDone: (barberId: string) => api.post(`/queue/barber/${barberId}/done`),
};
