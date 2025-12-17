// Payment limits for compliance
export const PAYMENT_LIMITS = {
  MIN_TOPUP_AMOUNT: 5000, // ₦5,000 minimum top-up
  MAX_WALLET_BALANCE: 8000000, // ₦8,000,000 maximum balance
  MIN_PURCHASE_AMOUNT: 100, // ₦100 minimum for airtime/data
} as const;

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return `₦${amount.toLocaleString("en-NG")}`;
};

// Validate top-up amount against limits
export const validateTopUp = (
  amount: number,
  currentBalance: number
): { valid: boolean; error?: string } => {
  if (amount < PAYMENT_LIMITS.MIN_TOPUP_AMOUNT) {
    return {
      valid: false,
      error: `Minimum top-up amount is ${formatCurrency(PAYMENT_LIMITS.MIN_TOPUP_AMOUNT)}`,
    };
  }

  const newBalance = currentBalance + amount;
  if (newBalance > PAYMENT_LIMITS.MAX_WALLET_BALANCE) {
    const maxAllowed = PAYMENT_LIMITS.MAX_WALLET_BALANCE - currentBalance;
    if (maxAllowed <= 0) {
      return {
        valid: false,
        error: `Your wallet has reached the maximum balance of ${formatCurrency(PAYMENT_LIMITS.MAX_WALLET_BALANCE)}`,
      };
    }
    return {
      valid: false,
      error: `Maximum top-up allowed is ${formatCurrency(maxAllowed)} to stay within the ${formatCurrency(PAYMENT_LIMITS.MAX_WALLET_BALANCE)} limit`,
    };
  }

  return { valid: true };
};
