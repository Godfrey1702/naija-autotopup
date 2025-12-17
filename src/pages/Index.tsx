import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneVerification } from "@/components/onboarding/PhoneVerification";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeView } from "@/components/views/HomeView";
import { TopUpView } from "@/components/views/TopUpView";
import { WalletView } from "@/components/views/WalletView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { SettingsView } from "@/components/views/SettingsView";
import { ManualPurchaseView } from "@/components/views/ManualPurchaseView";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [purchaseType, setPurchaseType] = useState<"airtime" | "data">("airtime");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Show phone verification if user is logged in but phone not verified
    if (user && profile && !profile.phone_verified) {
      setShowPhoneVerification(true);
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Phone verification flow
  if (showPhoneVerification) {
    return (
      <PhoneVerification
        onComplete={() => setShowPhoneVerification(false)}
        onSkip={() => setShowPhoneVerification(false)}
      />
    );
  }

  const handleNavigate = (tab: string) => {
    if (tab === "airtime" || tab === "data") {
      setPurchaseType(tab);
      setActiveTab("purchase");
    } else {
      setActiveTab(tab);
    }
  };

  // Main app
  const renderView = () => {
    switch (activeTab) {
      case "home":
        return <HomeView onNavigate={handleNavigate} />;
      case "topup":
        return <TopUpView onBack={() => setActiveTab("home")} />;
      case "wallet":
        return <WalletView onBack={() => setActiveTab("home")} />;
      case "analytics":
        return <AnalyticsView onBack={() => setActiveTab("home")} />;
      case "settings":
        return <SettingsView onBack={() => setActiveTab("home")} />;
      case "purchase":
        return <ManualPurchaseView onBack={() => setActiveTab("home")} initialType={purchaseType} />;
      default:
        return <HomeView onNavigate={handleNavigate} />;
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
