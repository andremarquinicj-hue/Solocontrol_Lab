'use client';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, ensureFirebaseUser, firebaseConfigured } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/lib/types';

interface AuthScopeValue {
  user: User | null;
  profile: UserProfile;
  loading: boolean;
  isPilot: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (...roles: UserRole[]) => boolean;
}

const PILOT_PROFILE: UserProfile = {
  uid: 'pilot',
  name: 'Coordenação',
  role: 'coordinator',
  active: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const AuthScopeContext = createContext<AuthScopeValue | null>(null);

async function loadProfile(user: User): Promise<UserProfile> {
  if (user.isAnonymous || !db) {
    return { ...PILOT_PROFILE, uid: user.uid, email: user.email || undefined };
  }

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;

  const now = new Date().toISOString();
  const created: UserProfile = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Usuário',
    email: user.email || undefined,
    role: 'technician',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, created);
  return created;
}

export function AuthScopeProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(PILOT_PROFILE);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    if (!auth?.currentUser) return;
    setProfile(await loadProfile(auth.currentUser));
  }

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async current => {
      if (!current) {
        await ensureFirebaseUser();
        return;
      }
      setUser(current);
      try {
        setProfile(await loadProfile(current));
      } finally {
        setLoading(false);
      }
    });

    ensureFirebaseUser().catch(() => setLoading(false));
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    if (!auth) throw new Error('Firebase Authentication não configurado.');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    setUser(credential.user);
    setProfile(await loadProfile(credential.user));
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
    await ensureFirebaseUser();
  }

  const value = useMemo<AuthScopeValue>(() => ({
    user,
    profile,
    loading,
    isPilot: !firebaseConfigured || Boolean(user?.isAnonymous),
    login,
    logout,
    refreshProfile,
    can: (...roles) => profile.role === 'admin' || roles.includes(profile.role),
  }), [user, profile, loading]);

  return <AuthScopeContext.Provider value={value}>{children}</AuthScopeContext.Provider>;
}

export function useAuthScope() {
  const value = useContext(AuthScopeContext);
  if (!value) throw new Error('useAuthScope must be used inside AuthScopeProvider');
  return value;
}
