import { Home, Wallet, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "wallet", icon: Wallet, label: "Wallet" },
  { id: "analytics", icon: BarChart3, label: "Insights" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto" role="tablist">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={`${item.label}${isActive ? ", currently selected" : ""}`}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-300",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  aria-hidden="true"
                />
              )}
              <item.icon className={cn("w-5 h-5 relative z-10", isActive && "text-primary")} aria-hidden="true" />
              <span className="text-[10px] mt-1 font-medium relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
