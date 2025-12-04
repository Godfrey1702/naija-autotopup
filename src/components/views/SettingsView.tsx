import { motion } from "framer-motion";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Smartphone,
  Shield,
  Bell,
  Target,
  HelpCircle,
  LogOut,
  Edit2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("10000");

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", value: "Adebayo Oluwaseun", action: true },
        { icon: Smartphone, label: "Linked Phone", value: "0803****5678", action: true },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Target, label: "Monthly Budget", value: `₦${Number(monthlyBudget).toLocaleString()}`, action: true, dialog: true },
        { icon: Bell, label: "Notifications", toggle: true, value: notifications },
      ],
    },
    {
      title: "Security",
      items: [
        { icon: Shield, label: "Security Settings", value: "PIN enabled", action: true },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & FAQ", action: true },
      ],
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
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="gradient" className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                AO
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Adebayo Oluwaseun</h3>
                <p className="text-sm text-muted-foreground">adebayo@email.com</p>
                <p className="text-xs text-primary mt-1">Premium Member</p>
              </div>
              <Button variant="ghost" size="icon">
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {group.title}
            </h3>
            <Card variant="gradient" className="divide-y divide-border">
              {group.items.map((item) => (
                <div key={item.label}>
                  {item.dialog ? (
                    <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                      <DialogTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                              <item.icon className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle>Set Monthly Budget</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Monthly Budget (₦)
                            </label>
                            <Input
                              type="number"
                              value={monthlyBudget}
                              onChange={(e) => setMonthlyBudget(e.target.value)}
                              className="h-14 text-lg"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            You'll be notified when you're approaching your budget limit.
                          </p>
                          <Button onClick={() => setBudgetDialogOpen(false)} className="w-full">
                            Save Budget
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : item.toggle ? (
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{item.label}</span>
                      </div>
                      <Switch
                        checked={item.value as boolean}
                        onCheckedChange={setNotifications}
                      />
                    </div>
                  ) : (
                    <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{item.label}</span>
                      </div>
                      {item.action && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{item.value}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </Card>
          </motion.div>
        ))}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          AutoTopUp v1.0.0 • Made with love for Nigerians
        </p>
      </div>
    </div>
  );
}
