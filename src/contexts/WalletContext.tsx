import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: "deposit" | "withdrawal" | "airtime_purchase" | "data_purchase" | "auto_topup";
  amount: number;
  balance_before: number;
  balance_after: number;
  status: "pending" | "completed" | "failed" | "refunded";
  reference: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AutoTopUpRule {
  id: string;
  user_id: string;
  type: "data" | "airtime";
  threshold_percentage: number;
  topup_amount: number;
  is_enabled: boolean;
  phone_number_id: string | null; // null means primary phone
  created_at: string;
  updated_at: string;
}

interface WalletContextType {
  wallet: Wallet | null;
  transactions: Transaction[];
  autoTopUpRules: AutoTopUpRule[];
  loading: boolean;
  refreshWallet: () => Promise<void>;
  fundWallet: (amount: number, reference?: string) => Promise<{ error: Error | null }>;
  createAutoTopUpRule: (type: "data" | "airtime", threshold: number, amount: number, phoneNumberId?: string | null) => Promise<{ error: Error | null }>;
  updateAutoTopUpRule: (id: string, updates: Partial<AutoTopUpRule>) => Promise<{ error: Error | null }>;
  deleteAutoTopUpRule: (id: string) => Promise<{ error: Error | null }>;
  toggleAutoTopUpRule: (id: string) => Promise<{ error: Error | null }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [autoTopUpRules, setAutoTopUpRules] = useState<AutoTopUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWallet = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching wallet:", error);
      return;
    }

    if (data) {
      setWallet({
        ...data,
        balance: Number(data.balance),
      });
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    setTransactions(
      (data || []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
        balance_before: Number(tx.balance_before),
        balance_after: Number(tx.balance_after),
        type: tx.type as Transaction["type"],
        status: tx.status as Transaction["status"],
        metadata: tx.metadata as Record<string, unknown>,
      }))
    );
  };

  const fetchAutoTopUpRules = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("auto_topup_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching auto top-up rules:", error);
      return;
    }

    setAutoTopUpRules(
      (data || []).map((rule) => ({
        ...rule,
        type: rule.type as "data" | "airtime",
        topup_amount: Number(rule.topup_amount),
        phone_number_id: rule.phone_number_id,
      }))
    );
  };

  const refreshWallet = async () => {
    setLoading(true);
    await Promise.all([fetchWallet(), fetchTransactions(), fetchAutoTopUpRules()]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      refreshWallet();
    } else {
      setWallet(null);
      setTransactions([]);
      setAutoTopUpRules([]);
      setLoading(false);
    }
  }, [user]);

  const fundWallet = async (amount: number, reference?: string) => {
    if (!user || !wallet) return { error: new Error("No wallet available") };

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;
    const txReference = reference || `DEP-${Date.now()}`;

    // Create transaction
    const { error: txError } = await supabase.from("transactions").insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type: "deposit",
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: "completed",
      reference: txReference,
      description: "Wallet Funded",
    });

    if (txError) {
      console.error("Error creating transaction:", txError);
      return { error: txError };
    }

    // Update wallet balance
    const { error: walletError } = await supabase
      .from("wallets")
      .update({ balance: balanceAfter })
      .eq("id", wallet.id);

    if (walletError) {
      console.error("Error updating wallet:", walletError);
      return { error: walletError };
    }

    await refreshWallet();
    toast({
      title: "Wallet Funded",
      description: `₦${amount.toLocaleString()} has been added to your wallet.`,
    });

    return { error: null };
  };

  const createAutoTopUpRule = async (type: "data" | "airtime", threshold: number, amount: number, phoneNumberId?: string | null) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("auto_topup_rules").insert({
      user_id: user.id,
      type,
      threshold_percentage: threshold,
      topup_amount: amount,
      is_enabled: true,
      phone_number_id: phoneNumberId || null,
    });

    if (error) {
      console.error("Error creating rule:", error);
      toast({
        title: "Error",
        description: "Failed to create auto top-up rule. You may already have a rule for this type and phone number.",
        variant: "destructive",
      });
      return { error };
    }

    await fetchAutoTopUpRules();
    toast({
      title: "Rule Created",
      description: `Auto top-up rule for ${type} has been created.`,
    });

    return { error: null };
  };

  const updateAutoTopUpRule = async (id: string, updates: Partial<AutoTopUpRule>) => {
    const { error } = await supabase
      .from("auto_topup_rules")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating rule:", error);
      return { error };
    }

    await fetchAutoTopUpRules();
    return { error: null };
  };

  const deleteAutoTopUpRule = async (id: string) => {
    const { error } = await supabase
      .from("auto_topup_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting rule:", error);
      return { error };
    }

    await fetchAutoTopUpRules();
    toast({
      title: "Rule Deleted",
      description: "Auto top-up rule has been removed.",
    });

    return { error: null };
  };

  const toggleAutoTopUpRule = async (id: string) => {
    const rule = autoTopUpRules.find((r) => r.id === id);
    if (!rule) return { error: new Error("Rule not found") };

    return updateAutoTopUpRule(id, { is_enabled: !rule.is_enabled });
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        autoTopUpRules,
        loading,
        refreshWallet,
        fundWallet,
        createAutoTopUpRule,
        updateAutoTopUpRule,
        deleteAutoTopUpRule,
        toggleAutoTopUpRule,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
