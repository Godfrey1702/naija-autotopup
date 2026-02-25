import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Smartphone, 
  Wifi, 
  Plus, 
  Pause, 
  Play, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/constants";
import { useScheduledTopUps, ScheduledTopUp } from "@/hooks/useScheduledTopUps";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScheduledTopUpsViewProps {
  onBack: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_STYLES: Record<string, { label: string; variant: any }> = {
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatScheduleDescription(schedule: ScheduledTopUp): string {
  const { schedule_type, recurring_day_of_week, recurring_day_of_month, recurring_time } = schedule;

  switch (schedule_type) {
    case "one_time":
      if (schedule.scheduled_at) {
        return new Date(schedule.scheduled_at).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return "One-time";
    case "daily":
      return `Daily${recurring_time ? ` at ${recurring_time}` : ""}`;
    case "weekly":
      if (recurring_day_of_week !== null && recurring_day_of_week !== undefined) {
        return `Every ${DAY_NAMES[recurring_day_of_week]}${recurring_time ? ` at ${recurring_time}` : ""}`;
      }
      return "Weekly";
    case "monthly":
      if (recurring_day_of_month) {
        return `${recurring_day_of_month}${getOrdinalSuffix(recurring_day_of_month)} of month${recurring_time ? ` at ${recurring_time}` : ""}`;
      }
      return "Monthly";
    default:
      return schedule_type;
  }
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

// ============================================================================
// SCHEDULE CARD COMPONENT
// ============================================================================

interface ScheduleCardProps {
  schedule: ScheduledTopUp;
  onCancel?: () => void;
  onTogglePause?: () => void;
  isOperating?: boolean;
}

function ScheduleCard({ 
  schedule, 
  onCancel, 
  onTogglePause,
  isOperating = false,
}: ScheduleCardProps) {
  const statusStyle = STATUS_STYLES[schedule.status] || STATUS_STYLES.active;
  const isActive = schedule.status === "active" || schedule.status === "paused";
  const phoneLabel = schedule.phone_number || "Unknown";
  const isPaused = schedule.status === "paused";

  return (
    <Card 
      className={`p-4 transition-opacity ${isOperating ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              schedule.type === "airtime" 
                ? "bg-primary/10 text-primary" 
                : "bg-accent/10 text-accent"
            }`}
          >
            {schedule.type === "airtime" ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{formatCurrency(schedule.amount)}</p>
              <Badge 
                variant={statusStyle.variant} 
                className="text-[10px] flex-shrink-0"
              >
                {statusStyle.label}
              </Badge>
              {isPaused && (
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                  <Pause className="w-3 h-3 mr-1" />
                  Paused
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-1">
              {schedule.type} • {schedule.network}
              {schedule.plan_id && ` • ${schedule.plan_id}`}
            </p>
            <p className="text-xs text-muted-foreground">{phoneLabel}</p>
          </div>
        </div>

        {isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1 rounded hover:bg-secondary ml-2 flex-shrink-0 disabled:opacity-50" 
                aria-label="Schedule options"
                disabled={isOperating}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onTogglePause && (
                <DropdownMenuItem 
                  onClick={onTogglePause}
                  disabled={isOperating}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onCancel && (
                <DropdownMenuItem 
                  onClick={onCancel} 
                  className="text-destructive focus:text-destructive"
                  disabled={isOperating}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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

      {schedule.next_execution_at && isActive && !isPaused && (
        <p className="text-xs text-primary mt-2 font-medium">
          Next: {new Date(schedule.next_execution_at).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      {isPaused && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          Paused schedules will not execute until resumed
        </p>
      )}
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduledTopUpsView({ onBack }: ScheduledTopUpsViewProps) {
  const { 
    schedules, 
    loading, 
    operationInProgress,
    cancelSchedule, 
    togglePauseSchedule 
  } = useScheduledTopUps();

  const [selectedForAction, setSelectedForAction] = useState<{
    id: string;
    action: "cancel" | "pause" | "resume";
  } | null>(null);

  const activeSchedules = schedules.filter(
    (s) => s.status === "active" || s.status === "paused"
  );
  const pastSchedules = schedules.filter(
    (s) => s.status === "completed" || s.status === "cancelled"
  );

  const handleCancel = async () => {
    if (!selectedForAction || selectedForAction.action !== "cancel") return;

    const result = await cancelSchedule(selectedForAction.id);
    setSelectedForAction(null);
  };

  const handleTogglePause = async () => {
    if (!selectedForAction || !["pause", "resume"].includes(selectedForAction.action)) {
      return;
    }

    const schedule = schedules.find((s) => s.id === selectedForAction.id);
    if (!schedule) return;

    await togglePauseSchedule(schedule);
    setSelectedForAction(null);
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
      <main className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Scheduled Top-Ups</h1>
        </div>

        {/* Active Schedules Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Upcoming ({activeSchedules.length})
          </h2>
          {activeSchedules.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active scheduled top-ups</p>
              <Button variant="link" onClick={onBack} className="mt-2">
                Create your first scheduled top-up
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {activeSchedules.map((schedule) => (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ScheduleCard
                      schedule={schedule}
                      onCancel={() => setSelectedForAction({ 
                        id: schedule.id, 
                        action: "cancel" 
                      })}
                      onTogglePause={() => setSelectedForAction({
                        id: schedule.id,
                        action: schedule.status === "paused" ? "resume" : "pause",
                      })}
                      isOperating={operationInProgress}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Past Schedules Section */}
        {pastSchedules.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              History ({pastSchedules.length})
            </h2>
            <div className="space-y-3">
              <AnimatePresence>
                {pastSchedules.map((schedule) => (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ScheduleCard schedule={schedule} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Info Alert */}
        {activeSchedules.length > 0 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-accent">
              <p className="font-medium mb-1">Scheduled top-ups run automatically</p>
              <p className="text-xs opacity-80">
                Pause schedules to temporarily stop executions. Cancel to remove permanently. Completed 
                and cancelled schedules appear in your history.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Dialog for Cancel */}
      <AlertDialog 
        open={selectedForAction?.action === "cancel"} 
        onOpenChange={(open) => {
          if (!open) setSelectedForAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The scheduled top-up will be permanently cancelled 
              and will not execute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3 my-4">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This is a permanent action
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Keep Schedule</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-destructive hover:bg-destructive/90"
              disabled={operationInProgress}
            >
              {operationInProgress ? "Cancelling..." : "Cancel Schedule"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Pause/Resume */}
      <AlertDialog 
        open={["pause", "resume"].includes(selectedForAction?.action || "")} 
        onOpenChange={(open) => {
          if (!open) setSelectedForAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedForAction?.action === "pause" ? "Pause Schedule?" : "Resume Schedule?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedForAction?.action === "pause"
                ? "This schedule will temporarily stop executing. No top-ups will be made until you resume it."
                : "This schedule will resume executing according to its schedule."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleTogglePause}
              disabled={operationInProgress}
            >
              {operationInProgress 
                ? "Processing..." 
                : selectedForAction?.action === "pause" 
                  ? "Pause Schedule" 
                  : "Resume Schedule"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

import { ChevronLeft } from "lucide-react";
