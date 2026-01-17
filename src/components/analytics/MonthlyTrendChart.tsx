import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MonthlyTrendChartProps {
  data: Array<{ month: string; amount: number; airtime: number; data: number }>;
  isLoading?: boolean;
}

export function MonthlyTrendChart({ data, isLoading }: MonthlyTrendChartProps) {
  const isEmpty = useMemo(() => data.every(d => d.amount === 0), [data]);

  if (isLoading) {
    return (
      <Card variant="gradient" className="p-4">
        <Skeleton className="h-4 w-36 mb-4" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card variant="gradient" className="p-4">
      <h3 className="font-semibold text-foreground mb-4">Monthly Spending Trend</h3>
      {isEmpty ? (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No spending data for this period</p>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₦${value.toLocaleString()}`,
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="airtime" name="Airtime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="data" name="Data" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
