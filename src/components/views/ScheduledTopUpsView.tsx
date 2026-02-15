import { useState } from "react";
import { ArrowLeft, Plus, Calendar, Clock, Smartphone, Wifi, MoreVertical, XCircle, Pause, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useScheduledTopUps, ScheduledTopUp } from "@/hooks/useScheduledTopUps";
import { formatCurrency } from "@/lib/constants";
import { CreateScheduleSheet } from "@/components/scheduled/CreateScheduleSheet";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ScheduledTopUpsViewProps {
  onBack: () => void;
}

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  paused: { label: "Paused", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  one_time: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatScheduleDescription(schedule: ScheduledTopUp): string {
  if (schedule.schedule_type === "one_time" && schedule.scheduled_at) {
    return new Date(schedule.scheduled_at).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const time = schedule.recurring_time
    ? new Date(`2000-01-01T${schedule.recurring_time}`).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
    : "";

  if (schedule.schedule_type === "daily") return `Every day at ${time}`;
  if (schedule.schedule_type === "weekly") {
    const day = schedule.recurring_day_of_week !== null ? DAY_NAMES[schedule.recurring_day_of_week] : "";
    return `Every ${day} at ${time}`;
  }
  if (schedule.schedule_type === "monthly") {
    const day = schedule.recurring_day_of_month ?? 1;
    const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
    return `${day}${suffix} of every month at ${time}`;
  }
  return "";
}

export function ScheduledTopUpsView({ onBack }: ScheduledTopUpsViewProps) {
  const { schedules, loading, cancelSchedule, updateSchedule } = useScheduledTopUps();
  const [showCreate, setShowCreate] = useState(false);

  const activeSchedules = schedules.filter((s) => s.status === "active" || s.status === "paused");
  const pastSchedules = schedules.filter((s) => s.status === "completed" || s.status === "cancelled");

  const handleTogglePause = async (schedule: ScheduledTopUp) => {
    const newStatus = schedule.status === "paused" ? "active" : "paused";
    await updateSchedule(schedule.id, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-secondary" aria-label="Go back">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Scheduled Top-Ups</h1>
              <p className="text-xs text-muted-foreground">Manage your scheduled purchases</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </header>

      <main className="px-5 py-6 space-y-6">
        {/* Active Schedules */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Upcoming ({activeSchedules.length})
          </h2>
          {activeSchedules.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No scheduled top-ups</p>
              <Button variant="link" onClick={() => setShowCreate(true)} className="mt-2">
                Create your first schedule
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onCancel={() => cancelSchedule(schedule.id)}
                  onTogglePause={() => handleTogglePause(schedule)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Schedules */}
        {pastSchedules.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              History ({pastSchedules.length})
            </h2>
            <div className="space-y-3">
              {pastSchedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>
          </section>
        )}
      </main>

      <CreateScheduleSheet open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

function ScheduleCard({
  schedule,
  onCancel,
  onTogglePause,
}: {
  schedule: ScheduledTopUp;
  onCancel?: () => void;
  onTogglePause?: () => void;
}) {
  const statusStyle = STATUS_STYLES[schedule.status] || STATUS_STYLES.active;
  const isActive = schedule.status === "active" || schedule.status === "paused";
  const phoneLabel = schedule.phone_numbers?.label || schedule.phone_numbers?.phone_number || "Unknown";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            schedule.type === "airtime" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
          }`}>
            {schedule.type === "airtime" ? <Smartphone className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{formatCurrency(schedule.amount)}</p>
              <Badge variant={statusStyle.variant} className="text-[10px]">{statusStyle.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground capitalize">{schedule.type} • {schedule.network}</p>
            <p className="text-xs text-muted-foreground">{phoneLabel}</p>
          </div>
        </div>

        {isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-secondary" aria-label="Schedule options">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onTogglePause && (
                <DropdownMenuItem onClick={onTogglePause}>
                  {schedule.status === "paused" ? (
                    <><Play className="w-4 h-4 mr-2" /> Resume</>
                  ) : (
                    <><Pause className="w-4 h-4 mr-2" /> Pause</>
                  )}
                </DropdownMenuItem>
              )}
              {onCancel && (
                <DropdownMenuItem onClick={onCancel} className="text-destructive">
                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{SCHEDULE_TYPE_LABELS[schedule.schedule_type]}</span>
        </div>
        <span>{formatScheduleDescription(schedule)}</span>
      </div>

      {schedule.max_executions && (
        <p className="text-xs text-muted-foreground mt-1">
          Executions: {schedule.total_executions}/{schedule.max_executions}
        </p>
      )}

      {schedule.next_execution_at && isActive && (
        <p className="text-xs text-primary mt-2 font-medium">
          Next: {new Date(schedule.next_execution_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}
    </Card>
  );
}
