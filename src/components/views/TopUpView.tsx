import { motion } from "framer-motion";
import { ChevronLeft, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TopUpViewProps {
  onBack: () => void;
}

export function TopUpView({ onBack }: TopUpViewProps) {
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
            <h1 className="text-xl font-bold text-foreground">Auto Top-Up</h1>
            <p className="text-sm text-muted-foreground">Manage your rules</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="gradient" className="p-8 text-center">
            <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Auto top-up feature is being rebuilt with improved rule management and plan selection.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
