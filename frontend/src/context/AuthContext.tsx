import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  username?: string;
  role: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT';
  language: 'rw' | 'en' | 'fr';
  status: 'ACTIVE' | 'SUSPENDED';
  invitation_token?: string;
  landlord_profile?: {
    id: string;
    business_type: string;
    business_name?: string;
    address?: string;
    district?: string;
    city?: string;
    tax_identifier?: string;
  };
  tenant_profile?: {
    id: string;
    national_id?: string;
    occupation?: string;
    property_name?: string;
    unit_number?: string;
    monthly_rent?: number;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  role: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerLandlord: (data: any) => Promise<UserProfile>;
  registerTenant: (data: any) => Promise<UserProfile>;
  updateUserProfile: (data: any) => Promise<UserProfile>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  resetPassword: (data: {
    email?: string;
    reset_token: string;
    new_password: string;
    confirm_password?: string;
  }) => Promise<{ message: string }>;
  changePassword: (data: { current_password: string; new_password: string; confirm_password?: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshUser = async (): Promise<UserProfile | null> => {
    const token = localStorage.getItem('notify_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const me = await api.auth.getMe();
      setUser(me);
      return me;
    } catch (err: any) {
      console.warn('User session invalid or expired:', err);
      localStorage.removeItem('notify_access_token');
      localStorage.removeItem('notify_refresh_token');
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setError(null);
    try {
      const res = await api.auth.login({ email, password });
      if (!res || !res.access_token) {
        throw new Error('Authentication failed: Missing session token.');
      }
      localStorage.setItem('notify_access_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('notify_refresh_token', res.refresh_token);
      }
      const me = await refreshUser(); if (!me) throw new Error('Authentication failed: Could not fetch user profile.'); return me;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Invalid email or password.');
      setError(msg);
      throw err;
    }
  };

  const registerLandlord = async (data: any): Promise<UserProfile> => {
    setError(null);
    try {
      const res = await api.auth.registerLandlord(data);
      if (!res || !res.access_token) {
        throw new Error('Registration failed: Missing session token.');
      }
      localStorage.setItem('notify_access_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('notify_refresh_token', res.refresh_token);
      }
      const me = await refreshUser(); if (!me) throw new Error('Authentication failed: Could not fetch user profile.'); return me;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Landlord registration failed.');
      setError(msg);
      throw err;
    }
  };

  const registerTenant = async (data: any): Promise<UserProfile> => {
    setError(null);
    try {
      const res = await api.auth.registerTenant(data);
      if (!res || !res.access_token) {
        throw new Error('Registration failed: Missing session token.');
      }
      localStorage.setItem('notify_access_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('notify_refresh_token', res.refresh_token);
      }
      const me = await refreshUser(); if (!me) throw new Error('Authentication failed: Could not fetch user profile.'); return me;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Tenant registration failed.');
      setError(msg);
      throw err;
    }
  };

  const forgotPassword = async (email: string): Promise<{ message: string; reset_token?: string }> => {
    setError(null);
    try {
      const res = await api.auth.forgotPassword(email);
      return res;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Failed to request password reset.');
      setError(msg);
      throw err;
    }
  };

  const resetPassword = async (data: {
    email?: string;
    reset_token: string;
    new_password: string;
    confirm_password?: string;
  }): Promise<{ message: string }> => {
    setError(null);
    try {
      const res = await api.auth.resetPassword(data);
      return res;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Failed to reset password.');
      setError(msg);
      throw err;
    }
  };

  const updateUserProfile = async (data: any): Promise<UserProfile> => {
    setError(null);
    try {
      const updated = await api.auth.updateProfile(data);
      setUser((prev) => (prev ? { ...prev, ...updated } : updated));
      return updated;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Failed to update profile.');
      setError(msg);
      throw err;
    }
  };

  const changePassword = async (data: { current_password: string; new_password: string; confirm_password?: string }): Promise<any> => {
    setError(null);
    try {
      const res = await api.auth.changePassword(data);
      return res;
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : (typeof err.data?.detail === "string" ? err.data.detail : 'Failed to update password.');
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('notify_access_token');
    localStorage.removeItem('notify_refresh_token');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        registerLandlord,
        registerTenant,
        forgotPassword,
        resetPassword,
        updateUserProfile,
        changePassword,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

