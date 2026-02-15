import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneVerification } from "@/components/onboarding/PhoneVerification";
import { KYCVerification } from "@/components/kyc/KYCVerification";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeView } from "@/components/views/HomeView";
import { TopUpView } from "@/components/views/TopUpView";
import { WalletView } from "@/components/views/WalletView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { SettingsView } from "@/components/views/SettingsView";
import { ManualPurchaseView } from "@/components/views/ManualPurchaseView";
import { ScheduledTopUpsView } from "@/components/views/ScheduledTopUpsView";
import { FullPageLoading } from "@/components/ui/loading-spinner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [purchaseType, setPurchaseType] = useState<"airtime" | "data">("airtime");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showKYCVerification, setShowKYCVerification] = useState(false);
  
  const { user, profile, loading, isKYCVerified } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check onboarding flow: Phone verification → KYC verification
    if (user && profile) {
      if (!profile.phone_verified) {
        setShowPhoneVerification(true);
        setShowKYCVerification(false);
      } else if (!isKYCVerified) {
        setShowPhoneVerification(false);
        setShowKYCVerification(true);
      } else {
        setShowPhoneVerification(false);
        setShowKYCVerification(false);
      }
    }
  }, [user, profile, isKYCVerified]);

  if (loading) {
    return <FullPageLoading message="Loading your dashboard..." />;
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

  // KYC verification flow
  if (showKYCVerification) {
    return (
      <KYCVerification
        onComplete={() => setShowKYCVerification(false)}
        onSkip={() => setShowKYCVerification(false)}
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
      case "schedules":
        return <ScheduledTopUpsView onBack={() => setActiveTab("home")} />;
      case "purchase":
        return <ManualPurchaseView onBack={() => setActiveTab("home")} initialType={purchaseType} />;
      default:
        return <HomeView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderView()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
