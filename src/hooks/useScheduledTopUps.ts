import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { scheduledTopUpService } from "@/api";

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

export function useScheduledTopUps() {
  const [schedules, setSchedules] = useState<ScheduledTopUp[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await scheduledTopUpService.getScheduledTopUps();
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
      await scheduledTopUpService.createScheduledTopUp(payload as unknown as Record<string, unknown>);
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
      await scheduledTopUpService.cancelScheduledTopUp(id);
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
      await scheduledTopUpService.updateScheduledTopUp(id, updates as Record<string, unknown>);
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
