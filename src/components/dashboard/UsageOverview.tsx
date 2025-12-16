import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageData {
  label: string;
  current: number;
  previous: number;
  unit: string;
  color: string;
}

interface UsageOverviewProps {
  data: UsageData[];
}

export function UsageOverview({ data }: UsageOverviewProps) {
  const hasActivity = data.some(item => item.current > 0 || item.previous > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h3 className="font-semibold text-foreground mb-4">This Month's Usage</h3>
      {!hasActivity ? (
        <Card variant="gradient" className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No activity yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Start using Auto Top-Up to see insights</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data.map((item, index) => {
            const hasNoData = item.current === 0 && item.previous === 0;
            const percentChange = item.previous > 0 
              ? ((item.current - item.previous) / item.previous) * 100 
              : 0;
            const isIncrease = percentChange > 0;

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card variant="gradient" className="p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">{item.label}</span>
                    {hasNoData ? (
                      <span className="text-sm text-muted-foreground/70">No activity yet</span>
                    ) : (
                      <>
                        <span className={`text-2xl font-bold ${item.color}`}>
                          {item.unit === "₦" ? `₦${item.current.toLocaleString()}` : `${item.current}${item.unit}`}
                        </span>
                        <div className="flex items-center gap-1 mt-2">
                          {isIncrease ? (
                            <TrendingUp className="w-3 h-3 text-destructive" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-primary" />
                          )}
                          <span className={`text-xs ${isIncrease ? "text-destructive" : "text-primary"}`}>
                            {Math.abs(percentChange).toFixed(0)}% vs last month
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
