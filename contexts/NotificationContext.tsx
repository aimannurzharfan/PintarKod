import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { API_URL } from '@/app/config';
import { useAuth } from './AuthContext';

export type NotificationType =
  | 'NEW_FORUM_THREAD'
  | 'NEW_LEARNING_MATERIAL'
  | 'FORUM_REPLY';

export type AppNotification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message?: string | null;
  data?: any;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPreferences = {
  notifyNewForumThreads: boolean;
  notifyNewLearningMaterials: boolean;
  notifyForumReplies: boolean;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  loading: boolean;
  refreshing: boolean;
  preferences: NotificationPreferences;
  updatingPreferences: boolean;
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  updatePreferences: (next: Partial<NotificationPreferences>) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifyNewForumThreads: true,
  notifyNewLearningMaterials: true,
  notifyForumReplies: true,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userIdNumber = useMemo(() => {
    if (!user?.id) return null;
    const numeric = Number(user.id);
    return Number.isFinite(numeric) ? numeric : null;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setNotifications([]);
      return;
    }
    setPreferences({
      notifyNewForumThreads:
        user.notifyNewForumThreads ?? DEFAULT_PREFERENCES.notifyNewForumThreads,
      notifyNewLearningMaterials:
        user.notifyNewLearningMaterials ?? DEFAULT_PREFERENCES.notifyNewLearningMaterials,
      notifyForumReplies:
        user.notifyForumReplies ?? DEFAULT_PREFERENCES.notifyForumReplies,
    });
  }, [user?.notifyForumReplies, user?.notifyNewForumThreads, user?.notifyNewLearningMaterials, user]);

  const refreshNotifications = useCallback(async () => {
    if (!userIdNumber) {
      setNotifications([]);
      return;
    }
    setRefreshing(true);
    try {
      const response = await fetch(
        `${API_URL}/api/notifications?userId=${encodeURIComponent(String(userIdNumber))}`
      );
      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }
      const data: AppNotification[] = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Notification refresh error', err);
    } finally {
      setRefreshing(false);
    }
  }, [userIdNumber]);

  const markAllAsRead = useCallback(async () => {
    if (!userIdNumber) return;
    try {
      const response = await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdNumber }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      console.error('Mark notifications read error', err);
    }
  }, [userIdNumber]);

  const clearNotifications = useCallback(async () => {
    if (!userIdNumber) return;
    try {
      const response = await fetch(`${API_URL}/api/notifications/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdNumber }),
      });
      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }
      setNotifications([]);
    } catch (err) {
      console.error('Clear notifications error', err);
    }
  }, [userIdNumber]);

  const updatePreferences = useCallback(
    async (next: Partial<NotificationPreferences>) => {
      if (!userIdNumber || !user) return;
      const merged = {
        ...preferences,
        ...next,
      };
      setUpdatingPreferences(true);
      try {
        const response = await fetch(`${API_URL}/api/notifications/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userIdNumber,
            notifyNewForumThreads: merged.notifyNewForumThreads,
            notifyNewLearningMaterials: merged.notifyNewLearningMaterials,
            notifyForumReplies: merged.notifyForumReplies,
          }),
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to update preferences');
        }
        setPreferences(merged);
        setUser({
          ...user,
          notifyNewForumThreads: merged.notifyNewForumThreads,
          notifyNewLearningMaterials: merged.notifyNewLearningMaterials,
          notifyForumReplies: merged.notifyForumReplies,
        });
      } catch (err) {
        console.error('Notification preference update error', err);
      } finally {
        setUpdatingPreferences(false);
      }
    },
    [preferences, setUser, user, userIdNumber]
  );

  useEffect(() => {
    if (!userIdNumber) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    refreshNotifications().catch((err) =>
      console.error('Initial notification refresh failed', err)
    );

    intervalRef.current = setInterval(() => {
      refreshNotifications().catch((err) =>
        console.error('Scheduled notification refresh failed', err)
      );
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshNotifications, userIdNumber]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      loading: refreshing,
      refreshing,
      preferences,
      updatingPreferences,
      unreadCount,
      refreshNotifications,
      markAllAsRead,
      clearNotifications,
      updatePreferences,
    }),
    [
      notifications,
      refreshNotifications,
      refreshing,
      preferences,
      updatingPreferences,
      unreadCount,
      markAllAsRead,
      clearNotifications,
      updatePreferences,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

