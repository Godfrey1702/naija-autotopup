/**
 * @fileoverview Notifications Service Layer
 * 
 * Abstracts notification CRUD and realtime subscriptions.
 * 
 * @module api/notifications
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch user notifications.
 */
export async function getNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  return { error };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { error };
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Subscribe to realtime notification inserts.
 * Returns a cleanup function.
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Record<string, unknown>) => void
) {
  const channel = supabase
    .channel("notifications-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new as Record<string, unknown>);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
