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
  token: string | null;
  setUser: (u: AuthUser, token?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser>(null);
  const [token, setToken] = useState<string | null>(null);

  const setUser = (u: AuthUser, newToken?: string) => {
    setUserState(u);
    if (newToken) {
      setToken(newToken);
    } else {
      setToken(null);
    }
  };

  const logout = () => {
    setUserState(null);
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    setUser,
    logout,
  }), [user, token]);

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


