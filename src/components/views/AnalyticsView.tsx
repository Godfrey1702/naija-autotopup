import { motion } from "framer-motion";
import { ChevronLeft, TrendingUp, TrendingDown, Calendar, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AnalyticsViewProps {
  onBack: () => void;
}

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const monthlyData = {
    totalSpent: 12500,
    dataUsed: 15.8,
    airtimeUsed: 4200,
    autoTopUps: 24,
    savings: 2100,
  };

  const weeklyBreakdown = [
    { week: "Week 1", data: 3.2, airtime: 800 },
    { week: "Week 2", data: 4.1, airtime: 1200 },
    { week: "Week 3", data: 5.5, airtime: 1100 },
    { week: "Week 4", data: 3.0, airtime: 1100 },
  ];

  const insights = [
    {
      title: "Data Usage Peak",
      description: "You use the most data on weekends, especially between 8-10 PM",
      type: "info" as const,
    },
    {
      title: "Savings Achieved",
      description: "Auto top-up saved you ₦2,100 in overage charges this month",
      type: "success" as const,
    },
    {
      title: "Budget Alert",
      description: "You're on track to exceed your monthly budget by ₦1,500",
      type: "warning" as const,
    },
  ];

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Insights</h1>
              <p className="text-sm text-muted-foreground">December 2024</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4" />
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card variant="gradient" className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-foreground">₦{monthlyData.totalSpent.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary">12% less than last month</span>
            </div>
          </Card>

          <Card variant="gradient" className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Data Used</p>
            <p className="text-2xl font-bold text-accent">{monthlyData.dataUsed}GB</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-destructive" />
              <span className="text-xs text-destructive">8% more than last month</span>
            </div>
          </Card>

          <Card variant="gradient" className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Auto Top-Ups</p>
            <p className="text-2xl font-bold text-foreground">{monthlyData.autoTopUps}</p>
            <span className="text-xs text-muted-foreground">Transactions</span>
          </Card>

          <Card variant="gradient" className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Money Saved</p>
            <p className="text-2xl font-bold text-primary">₦{monthlyData.savings.toLocaleString()}</p>
            <span className="text-xs text-muted-foreground">From auto top-ups</span>
          </Card>
        </motion.div>

        {/* Weekly Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-foreground mb-4">Weekly Breakdown</h3>
          <Card variant="gradient" className="p-4">
            <div className="space-y-4">
              {weeklyBreakdown.map((week, index) => (
                <div key={week.week} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-20">{week.week}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex h-6 rounded-full overflow-hidden bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(week.data / 6) * 100}%` }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        className="bg-accent"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(week.airtime / 1500) * 100}%` }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                        className="bg-primary"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-accent">{week.data}GB</span>
                    <span className="text-xs text-muted-foreground mx-1">|</span>
                    <span className="text-xs text-primary">₦{week.airtime}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-xs text-muted-foreground">Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Airtime</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">AI Insights</h3>
            <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">Powered by AI</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Card
                key={insight.title}
                variant="gradient"
                className={`p-4 border-l-4 ${
                  insight.type === "success"
                    ? "border-l-primary"
                    : insight.type === "warning"
                    ? "border-l-accent"
                    : "border-l-muted-foreground"
                }`}
              >
                <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Download Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4" />
            Download Monthly Report
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
