import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRangeFilter } from "@/hooks/useSpendingAnalytics";

interface AnalyticsFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
  network: string;
  onNetworkChange: (value: string) => void;
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  network,
  onNetworkChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeFilter)}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="last_6_months">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Select value={network} onValueChange={onNetworkChange}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue placeholder="All Networks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            <SelectItem value="MTN">MTN</SelectItem>
            <SelectItem value="Airtel">Airtel</SelectItem>
            <SelectItem value="Glo">Glo</SelectItem>
            <SelectItem value="9mobile">9mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
