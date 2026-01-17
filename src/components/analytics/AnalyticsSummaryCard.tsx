import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down';
    text: string;
    positive?: boolean;
  };
  isLoading?: boolean;
  accentColor?: 'primary' | 'accent' | 'foreground';
}

export function AnalyticsSummaryCard({
  title,
  value,
  subtitle,
  trend,
  isLoading,
  accentColor = 'foreground',
}: AnalyticsSummaryCardProps) {
  if (isLoading) {
    return (
      <Card variant="gradient" className="p-4">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-3 w-28" />
      </Card>
    );
  }

  const colorClass = {
    primary: 'text-primary',
    accent: 'text-accent',
    foreground: 'text-foreground',
  }[accentColor];

  return (
    <Card variant="gradient" className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend.direction === 'up' ? (
            <TrendingUp className={`w-3 h-3 ${trend.positive ? 'text-primary' : 'text-destructive'}`} />
          ) : (
            <TrendingDown className={`w-3 h-3 ${trend.positive ? 'text-primary' : 'text-destructive'}`} />
          )}
          <span className={`text-xs ${trend.positive ? 'text-primary' : 'text-destructive'}`}>
            {trend.text}
          </span>
        </div>
      )}
      {subtitle && !trend && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </Card>
  );
}
