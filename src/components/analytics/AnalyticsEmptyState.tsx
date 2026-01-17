import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function AnalyticsEmptyState({
  message = "No transactions yet. Start topping up to see your spending analytics!",
  onAction,
  actionLabel = "Make a Top-Up",
}: AnalyticsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">No Analytics Data</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{message}</p>
      {onAction && (
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
