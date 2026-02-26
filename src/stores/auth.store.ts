import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthOrganisation {
  id: string;
  name: string;
  type: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  organisation: AuthOrganisation | null;
  isAuthenticated: boolean;
  setAuth: (data: { accessToken: string; user: AuthUser; organisation: AuthOrganisation }) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      organisation: null,
      isAuthenticated: false,
      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          user: data.user,
          organisation: data.organisation,
          isAuthenticated: true,
        }),
      setToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          accessToken: null,
          user: null,
          organisation: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'vamp-auth',
      onRehydrate: () => {
        return (state) => {
          if (state?.accessToken && isTokenExpired(state.accessToken)) {
            state.accessToken = null;
            state.user = null;
            state.organisation = null;
            state.isAuthenticated = false;
          }
        };
      },
    },
  ),
);
