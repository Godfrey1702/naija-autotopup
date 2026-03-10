import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_LIMITS, validateTopUp, formatCurrency } from "@/lib/constants";
import { validateNigerianPhoneNumber, validatePurchaseAmount, parseApiError } from "@/lib/validation";
import { walletService, transactionService } from "@/api";

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
  phone_number_id: string | null;
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
    const { data, error } = await walletService.getWallet(user.id);
    if (error) {
      console.error("Error fetching wallet:", error);
      return;
    }
    if (data) {
      setWallet({ ...data, balance: Number(data.balance) });
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    const { data, error } = await transactionService.getTransactions(user.id);
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
    const { data, error } = await walletService.getAutoTopUpRules(user.id);
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

    const validation = validateTopUp(amount, wallet.balance);
    if (!validation.valid) {
      toast({ title: "Top-Up Limit", description: validation.error, variant: "destructive" });
      return { error: new Error(validation.error) };
    }

    try {
      const result = await walletService.fundWallet(amount, reference);
      if (!result?.success) {
        throw new Error(result?.error || "Failed to fund wallet");
      }
      await refreshWallet();
      toast({ title: "Wallet Funded", description: `${formatCurrency(amount)} has been added to your wallet.` });
      return { error: null };
    } catch (error) {
      console.error("Error funding wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fund wallet";
      if (errorMessage.includes("Maximum wallet balance")) {
        toast({ title: "Balance Limit Exceeded", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Funding Failed", description: errorMessage, variant: "destructive" });
      }
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
    if (!user || !wallet) {
      toast({ title: "Error", description: "Wallet not found. Please refresh and try again.", variant: "destructive" });
      return { error: new Error("No wallet available") };
    }

    const phoneValidation = validateNigerianPhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      toast({ title: "Invalid Phone Number", description: phoneValidation.error, variant: "destructive" });
      return { error: new Error(phoneValidation.error || "Invalid phone number") };
    }

    const amountValidation = validatePurchaseAmount(amount, wallet.balance, type);
    if (!amountValidation.valid) {
      toast({ title: "Invalid Amount", description: amountValidation.error, variant: "destructive" });
      return { error: new Error(amountValidation.error || "Invalid amount") };
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const txReference = `${type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const txType = type === "airtime" ? "airtime_purchase" as const : "data_purchase" as const;
    const cleanedPhone = phoneValidation.cleanedNumber;
    const detectedNetwork = network || phoneValidation.detectedNetwork || "MTN";

    // Create pending transaction via service layer
    const { data: txData, error: txError } = await walletService.createTransaction({
      wallet_id: wallet.id,
      user_id: user.id,
      type: txType,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: txReference,
      description: `${type === "airtime" ? "Airtime" : "Data"} purchase for ${cleanedPhone}`,
      metadata: {
        phone_number: cleanedPhone,
        phone_number_id: phoneNumberId,
        network: detectedNetwork,
        plan_id: planId,
        initiated_at: new Date().toISOString(),
      },
    });

    if (txError) {
      console.error("Error creating transaction:", txError);
      toast({ title: "Transaction Failed", description: "Could not initiate the purchase. Please try again.", variant: "destructive" });
      return { error: txError };
    }

    try {
      const functionName = type === "airtime" ? "payflex-airtime-topup" : "payflex-data-topup";
      const purchaseResult = await walletService.invokePurchaseFunction(functionName, {
        phoneNumber: cleanedPhone,
        amount,
        network: detectedNetwork.toLowerCase(),
        planId,
      });

      if (!purchaseResult?.success) {
        throw new Error(purchaseResult?.error || "Purchase failed");
      }

      // Update transaction status via service layer
      const updateResult = await walletService.updateTransactionStatus({
        transactionId: txData.id,
        status: "completed",
        metadata: {
          external_reference: purchaseResult.reference,
          external_transaction_id: purchaseResult.transactionId,
        },
        updateWalletBalance: true,
        balanceAfter,
      });

      if (!updateResult?.success) {
        console.error("Error updating transaction:", updateResult?.error);
      }

      await refreshWallet();
      toast({ title: "Purchase Successful! 🎉", description: `${formatCurrency(amount)} ${type} sent to ${cleanedPhone}` });
      return { error: null, transactionId: txData.id };
    } catch (error) {
      console.error("Purchase error:", error);

      // Mark transaction as failed via service layer
      try {
        await walletService.updateTransactionStatus({
          transactionId: txData.id,
          status: "failed",
          metadata: { failure_reason: error instanceof Error ? error.message : "Unknown error" },
        });
      } catch (updateErr) {
        console.error("Failed to update transaction status:", updateErr);
      }

      const parsedError = parseApiError(error);
      toast({ title: "Purchase Failed", description: parsedError.message, variant: "destructive" });
      return { error: error instanceof Error ? error : new Error(parsedError.message) };
    }
  };

  const createAutoTopUpRule = async (type: "data" | "airtime", threshold: number, amount: number, phoneNumberId?: string | null) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await walletService.createAutoTopUpRule({
      user_id: user.id,
      type,
      threshold_percentage: threshold,
      topup_amount: amount,
      is_enabled: true,
      phone_number_id: phoneNumberId || null,
    });

    if (error) {
      console.error("Error creating rule:", error);
      toast({ title: "Error", description: "Failed to create auto top-up rule. You may already have a rule for this type and phone number.", variant: "destructive" });
      return { error };
    }

    await fetchAutoTopUpRules();
    toast({ title: "Rule Created", description: `Auto top-up rule for ${type} has been created.` });
    return { error: null };
  };

  const updateAutoTopUpRuleHandler = async (id: string, updates: Partial<AutoTopUpRule>) => {
    const { error } = await walletService.updateAutoTopUpRule(id, updates as Record<string, unknown>);
    if (error) {
      console.error("Error updating rule:", error);
      return { error };
    }
    await fetchAutoTopUpRules();
    return { error: null };
  };

  const deleteAutoTopUpRuleHandler = async (id: string) => {
    const { error } = await walletService.deleteAutoTopUpRule(id);
    if (error) {
      console.error("Error deleting rule:", error);
      return { error };
    }
    await fetchAutoTopUpRules();
    toast({ title: "Rule Deleted", description: "Auto top-up rule has been removed." });
    return { error: null };
  };

  const toggleAutoTopUpRule = async (id: string) => {
    const rule = autoTopUpRules.find((r) => r.id === id);
    if (!rule) return { error: new Error("Rule not found") };
    return updateAutoTopUpRuleHandler(id, { is_enabled: !rule.is_enabled });
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
        updateAutoTopUpRule: updateAutoTopUpRuleHandler,
        deleteAutoTopUpRule: deleteAutoTopUpRuleHandler,
        toggleAutoTopUpRule,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
