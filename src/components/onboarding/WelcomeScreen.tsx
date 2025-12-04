import { motion } from "framer-motion";
import { Zap, Shield, TrendingUp, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Zap,
    title: "Auto Top-Up",
    description: "Never run out of data or airtime again",
  },
  {
    icon: Shield,
    title: "Secure Wallet",
    description: "Fund once, top up automatically",
  },
  {
    icon: TrendingUp,
    title: "Smart Insights",
    description: "Track spending and usage patterns",
  },
  {
    icon: Smartphone,
    title: "All Networks",
    description: "MTN, Glo, Airtel, 9mobile",
  },
];

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col gradient-hero px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-primary shadow-glow mb-6">
          <Zap className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Auto<span className="text-gradient">TopUp</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xs mx-auto">
          Smart airtime and data management for Nigerians
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex-1 space-y-4 mb-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="space-y-3"
      >
        <Button onClick={onGetStarted} size="xl" className="w-full">
          Get Started
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
