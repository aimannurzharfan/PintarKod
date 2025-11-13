import React, { createContext, useContext, useMemo, useState } from 'react';

type AuthUser = {
  id: string;
  username: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  profileImage?: string | null;
  notifyNewForumThreads?: boolean;
  notifyNewLearningMaterials?: boolean;
  notifyForumReplies?: boolean;
} | null;

type AuthContextValue = {
  user: AuthUser;
  setUser: (u: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    logout: () => setUser(null),
  }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


