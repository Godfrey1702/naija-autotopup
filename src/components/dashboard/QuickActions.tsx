import { motion } from "framer-motion";
import { Smartphone, Globe, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const actions = [
  { id: "airtime", icon: Smartphone, label: "Airtime", bgColor: "bg-primary/20", iconColor: "text-primary" },
  { id: "data", icon: Globe, label: "Data", bgColor: "bg-accent/20", iconColor: "text-accent" },
  { id: "history", icon: Receipt, label: "History", bgColor: "bg-secondary", iconColor: "text-foreground" },
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
      className="grid grid-cols-3 gap-3"
    >
      {actions.map((action) => (
        <motion.div key={action.id} variants={item}>
          <Card
            variant="gradient"
            className="p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all duration-300"
            onClick={() => onAction(action.id)}
          >
            <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center mb-2`}>
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}