import { create } from 'zustand';
import { UserProfile } from '../types';
import { localDB } from '../lib/local-db';

const PROFILE_KEY = 'profile';

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setProfile: (profile: UserProfile) => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => Promise<void>;
  // kept for backward compat with any remaining call sites
  logout: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: true,
  isOnboarded: false,

  setProfile: async (profile) => {
    await localDB.set(PROFILE_KEY, profile);
    set({ profile, isOnboarded: true });
  },

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await localDB.get<UserProfile>(PROFILE_KEY);
      if (profile) {
        set({ profile, isOnboarded: true });
      } else {
        set({ profile: null, isOnboarded: false });
      }
    } catch {
      set({ profile: null, isOnboarded: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, ...updates };
    set({ profile: updated });
    await localDB.set(PROFILE_KEY, updated);
  },

  resetProfile: async () => {
    await localDB.clearAll();
    set({ profile: null, isOnboarded: false });
  },

  logout: async () => {
    // No-op: kept for any residual call sites.
    // To reset the app fully, call resetProfile() instead.
  },
}));
