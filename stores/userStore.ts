import { create } from 'zustand';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_PROFILE } from '../constants/demo';

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setProfile: (profile: UserProfile) => void;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: true,
  isOnboarded: false,

  setProfile: (profile) => set({ profile, isOnboarded: true }),

  loadProfile: async () => {
    set({ isLoading: true });
    // Demo mode: skip auth and use mock profile
    if (IS_DEMO) {
      set({ profile: DEMO_PROFILE, isOnboarded: true, isLoading: false });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ profile: null, isLoading: false, isOnboarded: false });
        return;
      }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        set({ profile: data as UserProfile, isOnboarded: true });
      } else {
        set({ profile: null, isOnboarded: false });
      }
    } catch {
      set({ profile: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, ...updates };
    set({ profile: updated });
    if (!IS_DEMO) {
      await supabase.from('users').update(updates).eq('id', profile.id);
    }
  },

  logout: async () => {
    if (!IS_DEMO) await supabase.auth.signOut();
    set({ profile: null, isOnboarded: false });
  },
}));
