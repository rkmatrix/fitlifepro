import { create } from 'zustand';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_PROFILE } from '../constants/demo';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

const AUTH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

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
    const failsafe = setTimeout(() => {
      set((s) => (s.isLoading ? { isLoading: false } : s));
    }, 15_000);

    try {
      set({ isLoading: true });
      if (IS_DEMO) {
        set({ profile: DEMO_PROFILE, isOnboarded: true });
        return;
      }
      if (!SUPABASE_URL?.trim() || !SUPABASE_ANON_KEY?.trim()) {
        set({ profile: null, isOnboarded: false });
        return;
      }
      try {
        const { data: sessionData, error: sessionErr } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS
        );
        if (sessionErr) throw sessionErr;
        const user = sessionData.session?.user;
        if (!user) {
          set({ profile: null, isOnboarded: false });
          return;
        }
        const { data, error } = await withTimeout(
          supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
          AUTH_TIMEOUT_MS
        );
        if (error) throw error;
        if (data) {
          set({ profile: data as UserProfile, isOnboarded: true });
        } else {
          set({ profile: null, isOnboarded: false });
        }
      } catch {
        set({ profile: null, isOnboarded: false });
      }
    } finally {
      clearTimeout(failsafe);
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
