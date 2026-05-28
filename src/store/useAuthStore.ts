import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthStore {
  session: Session | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isAdmin: false,

  setSession: (session) => set({
    session,
    isAdmin: session !== null,
  }),
}));
