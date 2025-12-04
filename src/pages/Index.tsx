import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { PhoneSetup } from "@/components/onboarding/PhoneSetup";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeView } from "@/components/views/HomeView";
import { TopUpView } from "@/components/views/TopUpView";
import { WalletView } from "@/components/views/WalletView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { SettingsView } from "@/components/views/SettingsView";

type OnboardingStep = "welcome" | "phone" | "complete";

const Index = () => {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [activeTab, setActiveTab] = useState("home");

  // For demo purposes, skip onboarding with this state
  const [isOnboarded, setIsOnboarded] = useState(false);

  const handlePhoneComplete = (phone: string, network: string) => {
    console.log("Phone setup complete:", { phone, network });
    setOnboardingStep("complete");
    setIsOnboarded(true);
  };

  // Onboarding flow
  if (!isOnboarded) {
    return (
      <AnimatePresence mode="wait">
        {onboardingStep === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WelcomeScreen onGetStarted={() => setOnboardingStep("phone")} />
          </motion.div>
        )}
        {onboardingStep === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PhoneSetup
              onBack={() => setOnboardingStep("welcome")}
              onComplete={handlePhoneComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Main app
  const renderView = () => {
    switch (activeTab) {
      case "home":
        return <HomeView onNavigate={setActiveTab} />;
      case "topup":
        return <TopUpView onBack={() => setActiveTab("home")} />;
      case "wallet":
        return <WalletView onBack={() => setActiveTab("home")} />;
      case "analytics":
        return <AnalyticsView onBack={() => setActiveTab("home")} />;
      case "settings":
        return <SettingsView onBack={() => setActiveTab("home")} />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
