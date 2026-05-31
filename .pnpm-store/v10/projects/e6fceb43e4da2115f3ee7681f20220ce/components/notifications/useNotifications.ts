"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gql, useQuery, useMutation, useSubscription } from "@apollo/client";

// ── GraphQL documents ──────────────────────────────────────────────────────

const GET_NOTIFICATIONS = gql`
  query GetNotifications($notificationType: String, $unreadOnly: Boolean, $limit: Int) {
    notifications(notificationType: $notificationType, unreadOnly: $unreadOnly, limit: $limit) {
      id
      notificationType
      title
      message
      link
      isRead
      createdAt
    }
    unreadNotificationCount
  }
`;

const MARK_READ = gql`
  mutation MarkNotificationRead($id: Int!) {
    markNotificationRead(notificationId: $id)
  }
`;

const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

const CLEAR_ALL = gql`
  mutation ClearAllNotifications {
    clearAllNotifications
  }
`;

const ON_NOTIFICATION = gql`
  subscription OnNotification {
    notifications {
      id
      notificationType
      title
      message
      link
      isRead
      createdAt
    }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: number;
  notificationType: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationFilter = "all" | "contract_paused" | "webhook_failure" | "rate_limit" | "system" | "alert";

export interface UseNotificationsOptions {
  filter?: NotificationFilter;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications({ filter = "all" }: UseNotificationsOptions = {}) {
  const wsAvailable = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_WS_URL;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const { loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      notificationType: filter === "all" ? null : filter,
      unreadOnly: false,
      limit: 50,
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (!mountedRef.current) return;
      setNotifications(data?.notifications ?? []);
      setUnreadCount(data?.unreadNotificationCount ?? 0);
    },
  });

  // Real-time subscription
  useSubscription(ON_NOTIFICATION, {
    skip: !wsAvailable,
    onData: ({ data }) => {
      if (!mountedRef.current) return;
      const incoming: NotificationItem = data.data?.notifications;
      if (!incoming) return;
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev].slice(0, 50);
      });
      if (!incoming.isRead) {
        setUnreadCount((c) => c + 1);
      }
    },
  });

  const [markReadMutation] = useMutation(MARK_READ);
  const [markAllReadMutation] = useMutation(MARK_ALL_READ);
  const [clearAllMutation] = useMutation(CLEAR_ALL);

  const markRead = useCallback(
    async (id: number) => {
      await markReadMutation({ variables: { id } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [markReadMutation]
  );

  const markAllRead = useCallback(async () => {
    await markAllReadMutation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [markAllReadMutation]);

  const clearAll = useCallback(async () => {
    await clearAllMutation();
    setNotifications([]);
    setUnreadCount(0);
  }, [clearAllMutation]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    clearAll,
    refetch,
  };
}
