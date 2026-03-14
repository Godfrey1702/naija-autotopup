/**
 * @fileoverview Reusable stat card for admin dashboard.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-8 w-28 mb-1" />
        <Skeleton className="h-3 w-24" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}
