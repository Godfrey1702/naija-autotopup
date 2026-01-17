import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SpendingPieChartProps {
  airtimeSpend: number;
  dataSpend: number;
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))'];

export function SpendingPieChart({ airtimeSpend, dataSpend, isLoading }: SpendingPieChartProps) {
  const data = useMemo(() => [
    { name: 'Airtime', value: airtimeSpend },
    { name: 'Data', value: dataSpend },
  ], [airtimeSpend, dataSpend]);

  const total = airtimeSpend + dataSpend;
  const isEmpty = total === 0;

  if (isLoading) {
    return (
      <Card variant="gradient" className="p-4">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card variant="gradient" className="p-4">
      <h3 className="font-semibold text-foreground mb-4">Data vs Airtime</h3>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No transaction data available</p>
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `₦${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">
            Airtime: ₦{airtimeSpend.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-xs text-muted-foreground">
            Data: ₦{dataSpend.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
}
