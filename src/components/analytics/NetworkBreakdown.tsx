import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface NetworkBreakdownProps {
  spendByNetwork: Record<string, number>;
  isLoading?: boolean;
}

const NETWORK_COLORS: Record<string, string> = {
  MTN: 'bg-yellow-500',
  Airtel: 'bg-red-500',
  Glo: 'bg-green-500',
  '9mobile': 'bg-green-600',
  Unknown: 'bg-muted-foreground',
};

export function NetworkBreakdown({ spendByNetwork, isLoading }: NetworkBreakdownProps) {
  const networks = Object.entries(spendByNetwork).sort((a, b) => b[1] - a[1]);
  const total = networks.reduce((sum, [, amount]) => sum + amount, 0);
  const isEmpty = total === 0;

  if (isLoading) {
    return (
      <Card variant="gradient" className="p-4">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card variant="gradient" className="p-4">
      <h3 className="font-semibold text-foreground mb-4">Spend by Network</h3>
      {isEmpty ? (
        <div className="py-8 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No network data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {networks.map(([network, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            const colorClass = NETWORK_COLORS[network] || NETWORK_COLORS.Unknown;
            
            return (
              <div key={network}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                    <span className="text-sm text-foreground">{network}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    ₦{amount.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
