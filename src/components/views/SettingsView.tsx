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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneNumberManagement } from "@/components/settings/PhoneNumberManagement";
import { BudgetSettings } from "@/components/settings/BudgetSettings";

interface SettingsViewProps {
  onBack: () => void;
}

// Helper to mask phone number for privacy display
function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "Not linked";
  if (phone.length < 6) return phone;
  const firstPart = phone.slice(0, 4);
  const lastPart = phone.slice(-4);
  return `${firstPart}****${lastPart}`;
}

// Helper to get initials from name
function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name[0].toUpperCase();
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { profile, user, signOut, isKYCVerified } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  // Get user data from auth context
  const displayName = profile?.full_name || "User";
  const email = user?.email || "No email";
  const initials = getInitials(profile?.full_name);

  // Get KYC status display
  const getKYCStatus = () => {
    if (!profile) return { label: "Not Started", color: "text-muted-foreground" };
    switch (profile.kyc_status) {
      case "verified":
        return { label: "Verified", color: "text-primary" };
      case "pending":
        return { label: "Pending", color: "text-yellow-500" };
      case "rejected":
        return { label: "Rejected", color: "text-destructive" };
      default:
        return { label: "Not Started", color: "text-muted-foreground" };
    }
  };

  const kycStatus = getKYCStatus();

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", value: displayName, action: true },
        { icon: Smartphone, label: "Phone Numbers", value: "Manage", action: true, phoneDialog: true },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Target, label: "Monthly Budget", value: "Manage", action: true, budgetDialog: true },
        { icon: Bell, label: "Notifications", toggle: true, value: notifications },
      ],
    },
    {
      title: "Security & KYC",
      items: [
        { icon: Shield, label: "KYC Status", value: kycStatus.label, valueColor: kycStatus.color, action: !isKYCVerified },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & FAQ", action: true },
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut();
  };

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
                {initials}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${profile?.phone_verified ? "text-primary" : "text-muted-foreground"}`}>
                    {profile?.phone_verified ? "Phone Verified" : "Phone Unverified"}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className={`text-xs ${kycStatus.color}`}>
                    KYC: {kycStatus.label}
                  </span>
                </div>
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
                  {(item as any).budgetDialog ? (
                    <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                      <DialogTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50">
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
                      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Monthly Budget</DialogTitle>
                        </DialogHeader>
                        <BudgetSettings />
                      </DialogContent>
                    </Dialog>
                  ) : item.phoneDialog ? (
                    <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
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
                      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Phone Numbers</DialogTitle>
                        </DialogHeader>
                        <PhoneNumberManagement />
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
                          <span className={`text-sm ${(item as any).valueColor || "text-muted-foreground"}`}>{item.value}</span>
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
          <Button 
            variant="outline" 
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleLogout}
          >
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
