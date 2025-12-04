import { motion } from "framer-motion";
import { Smartphone, Wifi, Zap, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const actions = [
  { id: "airtime", icon: Smartphone, label: "Airtime", color: "text-primary" },
  { id: "data", icon: Wifi, label: "Data", color: "text-accent" },
  { id: "autotopup", icon: Zap, label: "Auto Top-Up", color: "text-primary" },
  { id: "history", icon: Receipt, label: "History", color: "text-muted-foreground" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-3"
    >
      {actions.map((action) => (
        <motion.div key={action.id} variants={item}>
          <Card
            variant="gradient"
            className="p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all duration-300"
            onClick={() => onAction(action.id)}
          >
            <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-2 ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
