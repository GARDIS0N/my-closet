import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/closet.js';
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  resetPasswordForEmail,
  getSession,
} from './supabaseClient.js';
import { closetService } from './closetService.js';
import { idb } from './storageAdapter.js';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocalMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  switchToGuestMode: (name?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_ID_KEY = 'mycloset_guest_user_id';

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return 'guest_fallback_id';
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = `user_guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(true);

  // Initialize session on load
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (isSupabaseConfigured()) {
          const session = await getSession();
          if (session?.user) {
            const profile = await closetService.getProfile(session.user.id);
            if (mounted) {
              if (profile) {
                setUser(profile);
              } else {
                const newProfile: UserProfile = {
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name:
                    session.user.user_metadata?.full_name ||
                    session.user.email?.split('@')[0] ||
                    'Wardrobe Curator',
                  preferred_style: [],
                  occasions: [],
                  preferred_colors: [],
                  onboarding_completed: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                await closetService.saveProfile(newProfile);
                setUser(newProfile);
              }
              setIsLocalMode(false);
              setIsLoading(false);
              return;
            }
          }
        }

        // Check local profile in IndexedDB using persistent unique guest ID
        const guestId = getOrCreateGuestId();
        const storedGuest = await idb.get<UserProfile>('profiles', guestId);
        if (storedGuest && mounted) {
          setUser(storedGuest);
          setIsLocalMode(true);
          setIsLoading(false);
          return;
        }

        // For a brand new local user, initialize empty profile
        const freshProfile: UserProfile = {
          id: guestId,
          email: '',
          full_name: 'Guest Curator',
          preferred_style: [],
          occasions: [],
          preferred_colors: [],
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await closetService.saveProfile(freshProfile);

        if (mounted) {
          setUser(freshProfile);
          setIsLocalMode(true);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await signInWithEmail(email, pass);
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data.user) {
          let profile = await closetService.getProfile(data.user.id);
          if (!profile) {
            profile = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              preferred_style: ['Casual'],
              occasions: ['Casual Outings'],
              preferred_colors: ['White', 'Navy Blue'],
              onboarding_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await closetService.saveProfile(profile);
          }
          setUser(profile);
          setIsLocalMode(false);
          setIsLoading(false);
          return { success: true };
        }
      }

      // Local mode fallback login
      const localId = `user_local_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      let profile = await idb.get<UserProfile>('profiles', localId);
      if (!profile) {
        profile = {
          id: localId,
          email,
          full_name: email.split('@')[0],
          preferred_style: ['Minimalist'],
          occasions: ['Work', 'Casual Outings'],
          preferred_colors: ['Forest Green', 'Cream / Off-White'],
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await closetService.saveProfile(profile);
      }
      setUser(profile);
      setIsLocalMode(true);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await signUpWithEmail(email, pass, { full_name: name });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data.user) {
          const newProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: name || email.split('@')[0],
            preferred_style: [],
            occasions: [],
            preferred_colors: [],
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await closetService.saveProfile(newProfile);
          setUser(newProfile);
          setIsLocalMode(false);
          setIsLoading(false);
          return { success: true };
        }
      }

      // Local mode registration
      const localId = `user_local_${Date.now()}`;
      const newProfile: UserProfile = {
        id: localId,
        email,
        full_name: name || email.split('@')[0],
        preferred_style: [],
        occasions: [],
        preferred_colors: [],
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await closetService.saveProfile(newProfile);
      setUser(newProfile);
      setIsLocalMode(true);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (!isLocalMode && isSupabaseConfigured()) {
      await supabaseSignOut();
    }
    // Reset active user state
    setUser(null);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await resetPasswordForEmail(email);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: true };
  };

  const switchToGuestMode = async (name = 'Guest Curator') => {
    const guestId = getOrCreateGuestId();
    let profile = await idb.get<UserProfile>('profiles', guestId);
    if (!profile) {
      profile = {
        id: guestId,
        email: '',
        full_name: name,
        preferred_style: [],
        occasions: [],
        preferred_colors: [],
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await closetService.saveProfile(profile);
    }
    setUser(profile);
    setIsLocalMode(true);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = await closetService.saveProfile({ ...user, ...updates });
    setUser(updated);
  };

  const completeOnboarding = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = await closetService.saveProfile({
      ...user,
      ...data,
      onboarding_completed: true,
    });
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isLocalMode,
        login,
        register,
        logout,
        resetPassword,
        switchToGuestMode,
        updateProfile,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
