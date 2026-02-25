import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ScheduledTopUp {
  id: string;
  user_id: string;
  phone_number: string | null;
  phone_number_id: string | null;
  type: "airtime" | "data";
  network: string;
  amount: number;
  plan_id: string | null;
  schedule_type: "one_time" | "daily" | "weekly" | "monthly";
  scheduled_at: string | null;
  recurring_time: string | null;
  recurring_day_of_week: number | null;
  recurring_day_of_month: number | null;
  max_executions: number | null;
  total_executions: number;
  status: "active" | "paused" | "completed" | "cancelled";
  next_execution_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulePayload {
  type: "airtime" | "data";
  network: string;
  amount: number;
  plan_id?: string;
  schedule_type: "one_time" | "daily" | "weekly" | "monthly";
  scheduled_at?: string;
  recurring_time?: string;
  recurring_day_of_week?: number;
  recurring_day_of_month?: number;
  max_executions?: number;
  phone_number: string;
}

// ============================================================================
// API BASE URL
// ============================================================================

const SCHEDULED_TOPUPS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-topups`;
const CANCEL_TOPUP_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-managed-topup`;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useScheduledTopUps() {
  const [schedules, setSchedules] = useState<ScheduledTopUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationInProgress, setOperationInProgress] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Retrieves auth headers with current session token
   */
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expired. Please log in again.");
    
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  /**
   * Fetches all scheduled top-ups for the current user
   */
  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(SCHEDULED_TOPUPS_BASE, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `HTTP ${response.status}: Failed to fetch schedules`);
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data.schedules)) {
        setSchedules(
          data.schedules.map((s: ScheduledTopUp) => ({
            ...s,
            amount: Number(s.amount),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Failed to Load Schedules",
        description: error instanceof Error ? error.message : "Unable to fetch your scheduled top-ups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch schedules on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user, fetchSchedules]);

  /**
   * Creates a new scheduled top-up
   */
  const createSchedule = async (payload: CreateSchedulePayload) => {
    try {
      setOperationInProgress(true);
      const headers = await getAuthHeaders();

      const response = await fetch(SCHEDULED_TOPUPS_BASE, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Failed to create schedule (${response.status})`);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create schedule");
      }

      await fetchSchedules();
      toast({
        title: "Schedule Created",
        description: `Your ${payload.type} top-up has been scheduled`,
      });

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create schedule";
      console.error("Create schedule error:", message);
      toast({
        title: "Error Creating Schedule",
        description: message,
        variant: "destructive",
      });
      return { error: error instanceof Error ? error : new Error(message) };
    } finally {
      setOperationInProgress(false);
    }
  };

  /**
   * Cancels a scheduled top-up permanently
   */
  const cancelSchedule = async (scheduleId: string) => {
    try {
      setOperationInProgress(true);
      const headers = await getAuthHeaders();

      const response = await fetch(`${CANCEL_TOPUP_BASE}?id=${scheduleId}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Failed to cancel schedule (${response.status})`);
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to cancel schedule");
      }

      await fetchSchedules();
      toast({
        title: "Schedule Cancelled",
        description: "Your scheduled top-up has been cancelled",
      });

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel schedule";
      console.error("Cancel schedule error:", message);
      toast({
        title: "Error Cancelling Schedule",
        description: message,
        variant: "destructive",
      });
      return { error: error instanceof Error ? error : new Error(message) };
    } finally {
      setOperationInProgress(false);
    }
  };

  /**
   * Pauses a scheduled top-up
   */
  const pauseSchedule = async (scheduleId: string) => {
    try {
      setOperationInProgress(true);
      const headers = await getAuthHeaders();

      const response = await fetch(`${CANCEL_TOPUP_BASE}?id=${scheduleId}&action=pause`, {
        method: "PATCH",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Failed to pause schedule (${response.status})`);
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to pause schedule");
      }

      await fetchSchedules();
      toast({
        title: "Schedule Paused",
        description: "Your scheduled top-up has been paused",
      });

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to pause schedule";
      console.error("Pause schedule error:", message);
      toast({
        title: "Error Pausing Schedule",
        description: message,
        variant: "destructive",
      });
      return { error: error instanceof Error ? error : new Error(message) };
    } finally {
      setOperationInProgress(false);
    }
  };

  /**
   * Resumes a paused scheduled top-up
   */
  const resumeSchedule = async (scheduleId: string) => {
    try {
      setOperationInProgress(true);
      const headers = await getAuthHeaders();

      const response = await fetch(`${CANCEL_TOPUP_BASE}?id=${scheduleId}&action=resume`, {
        method: "PATCH",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Failed to resume schedule (${response.status})`);
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to resume schedule");
      }

      await fetchSchedules();
      toast({
        title: "Schedule Resumed",
        description: "Your scheduled top-up has been resumed",
      });

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resume schedule";
      console.error("Resume schedule error:", message);
      toast({
        title: "Error Resuming Schedule",
        description: message,
        variant: "destructive",
      });
      return { error: error instanceof Error ? error : new Error(message) };
    } finally {
      setOperationInProgress(false);
    }
  };

  /**
   * Toggles pause/resume based on current status
   */
  const togglePauseSchedule = async (schedule: ScheduledTopUp) => {
    if (schedule.status === "paused") {
      return resumeSchedule(schedule.id);
    } else if (schedule.status === "active") {
      return pauseSchedule(schedule.id);
    } else {
      return {
        error: new Error(`Cannot pause/resume a ${schedule.status} schedule`),
      };
    }
  };

  return {
    schedules,
    loading,
    operationInProgress,
    fetchSchedules,
    createSchedule,
    cancelSchedule,
    pauseSchedule,
    resumeSchedule,
    togglePauseSchedule,
  };
}
