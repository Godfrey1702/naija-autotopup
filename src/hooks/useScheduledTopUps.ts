import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ScheduledTopUp {
  id: string;
  user_id: string;
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
  phone_numbers?: {
    phone_number: string;
    label: string | null;
    network_provider: string | null;
  } | null;
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
  phone_number_id?: string;
}

export function useScheduledTopUps() {
  const [schedules, setSchedules] = useState<ScheduledTopUp[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expired");
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke("scheduled-topups", {
        method: "GET",
        headers,
      });
      if (error) throw error;
      if (data?.success) {
        setSchedules(data.schedules.map((s: ScheduledTopUp) => ({
          ...s,
          amount: Number(s.amount),
        })));
      }
    } catch (e) {
      console.error("Error fetching schedules:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSchedules();
  }, [user, fetchSchedules]);

  const createSchedule = async (payload: CreateSchedulePayload) => {
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke("scheduled-topups", {
        method: "POST",
        headers,
        body: payload,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create schedule");
      
      await fetchSchedules();
      toast({ title: "Schedule Created", description: `Your ${payload.type} top-up has been scheduled.` });
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create schedule";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { error: e instanceof Error ? e : new Error(msg) };
    }
  };

  const cancelSchedule = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke(`scheduled-topups?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to cancel");

      await fetchSchedules();
      toast({ title: "Schedule Cancelled", description: "The scheduled top-up has been cancelled." });
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to cancel schedule";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { error: e instanceof Error ? e : new Error(msg) };
    }
  };

  const updateSchedule = async (id: string, updates: Partial<CreateSchedulePayload> & { status?: string }) => {
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke(`scheduled-topups?id=${id}`, {
        method: "PUT",
        headers,
        body: updates,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to update");

      await fetchSchedules();
      toast({ title: "Schedule Updated", description: "Your schedule has been updated." });
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update schedule";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { error: e instanceof Error ? e : new Error(msg) };
    }
  };

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    cancelSchedule,
    updateSchedule,
  };
}
