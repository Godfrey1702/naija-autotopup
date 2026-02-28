import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import apiClient from '@/lib/apiClient';
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_LIMITS, validateTopUp, formatCurrency } from "@/lib/constants";
import { validateNigerianPhoneNumber, validatePurchaseAmount, parseApiError } from "@/lib/validation";

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
  purchaseAirtimeOrData: (type: "airtime" | "data", amount: number, phoneNumber: string, phoneNumberId: string | null, network?: string, planId?: string) => Promise<{ error: Error | null; transactionId?: string }>;
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

    try {
      const data = await apiClient.apiRequest('GET', '/wallets/me');
      if (data) {
        // API returns wallet object
        setWallet({
          ...(data as any),
          balance: Number((data as any).balance),
        });
      }
    } catch (err) {
      console.error('Error fetching wallet via backend:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const resp = await apiClient.apiRequest('GET', '/transactions/history?limit=50');
      const list = (resp as any).data || (resp as any);
      setTransactions(
        (list || []).map((tx: any) => ({
          ...tx,
          amount: Number(tx.amount),
          balance_before: Number(tx.balanceSnapshot ?? tx.balance_before ?? 0),
          balance_after: Number(tx.balance_after ?? tx.balanceSnapshot ?? 0),
          type: tx.type as Transaction['type'],
          status: tx.status as Transaction['status'],
          metadata: tx.metadata as Record<string, unknown>,
        }))
      );
    } catch (err) {
      console.error('Error fetching transactions via backend:', err);
    }
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

    // Validate payment limits (client-side validation for UX)
    const validation = validateTopUp(amount, wallet.balance);
    if (!validation.valid) {
      toast({
        title: "Top-Up Limit",
        description: validation.error,
        variant: "destructive",
      });
      return { error: new Error(validation.error) };
    }

    try {
      await apiClient.apiRequest('POST', '/transactions/deposit', { amount, description: reference });
      await refreshWallet();
      toast({ title: 'Wallet Funded', description: `${formatCurrency(amount)} has been added to your wallet.` });
      return { error: null };
    } catch (error) {
      console.error('Error funding wallet via backend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fund wallet';
      toast({ title: 'Funding Failed', description: errorMessage, variant: 'destructive' });
      return { error: error instanceof Error ? error : new Error(errorMessage) };
    }
  };

  const purchaseAirtimeOrData = async (
    type: "airtime" | "data",
    amount: number,
    phoneNumber: string,
    phoneNumberId: string | null,
    network?: string,
    planId?: string
  ): Promise<{ error: Error | null; transactionId?: string }> => {
    // Validation: Check wallet exists
    if (!user || !wallet) {
      const error = new Error("No wallet available");
      toast({
        title: "Error",
        description: "Wallet not found. Please refresh and try again.",
        variant: "destructive",
      });
      return { error };
    }

    // Validation: Phone number
    const phoneValidation = validateNigerianPhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      const error = new Error(phoneValidation.error || "Invalid phone number");
      toast({
        title: "Invalid Phone Number",
        description: phoneValidation.error,
        variant: "destructive",
      });
      return { error };
    }

    // Validation: Amount
    const amountValidation = validatePurchaseAmount(amount, wallet.balance, type);
    if (!amountValidation.valid) {
      const error = new Error(amountValidation.error || "Invalid amount");
      toast({
        title: "Invalid Amount",
        description: amountValidation.error,
        variant: "destructive",
      });
      return { error };
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const txReference = `${type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const txType = type === "airtime" ? "airtime_purchase" : "data_purchase";
    const cleanedPhone = phoneValidation.cleanedNumber;
    const detectedNetwork = network || phoneValidation.detectedNetwork || "MTN";

    // Create purchase via backend
    try {
      const category = type === 'airtime' ? 'AIRTIME' : 'DATA';
      const payload = {
        amount,
        category,
        provider: (detectedNetwork || 'MTN').toUpperCase(),
        phoneNumber: cleanedPhone,
        description: `${type === 'airtime' ? 'Airtime' : 'Data'} purchase for ${cleanedPhone}`,
        metadata: {
          planId,
          phone_number_id: phoneNumberId,
        },
      };

      const tx = await apiClient.apiRequest('POST', '/transactions/purchase', payload);

      await refreshWallet();
      toast({ title: 'Purchase Successful! 🎉', description: `${formatCurrency(amount)} ${type} sent to ${cleanedPhone}` });

      return { error: null, transactionId: (tx as any).id };
    } catch (error) {
      console.error('Purchase error via backend:', error);
      const parsedError = parseApiError(error);
      toast({ title: 'Purchase Failed', description: parsedError.message, variant: 'destructive' });
      return { error: error instanceof Error ? error : new Error(parsedError.message) };
    }
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
        purchaseAirtimeOrData,
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
