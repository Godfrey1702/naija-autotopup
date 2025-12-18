// Payment limits for compliance
export const PAYMENT_LIMITS = {
  MIN_TOPUP_AMOUNT: 5000, // ₦5,000 minimum top-up
  MAX_WALLET_BALANCE: 8000000, // ₦8,000,000 maximum balance
  MIN_PURCHASE_AMOUNT: 100, // ₦100 minimum for airtime/data
} as const;

// Pricing margin for data plans (5%)
export const PRICING_MARGIN = 0.05;

// Calculate final price with margin
export const calculatePriceWithMargin = (costPrice: number): number => {
  return Math.ceil(costPrice * (1 + PRICING_MARGIN));
};

// Data plans with cost prices and calculated final prices
export interface DataPlan {
  id: string;
  label: string;
  dataAmount: string;
  validity: string;
  costPrice: number;
  finalPrice: number;
}

export const DATA_PLANS: DataPlan[] = [
  { id: '500mb', label: '500MB - 1 Day', dataAmount: '500MB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285) },
  { id: '1gb', label: '1GB - 1 Day', dataAmount: '1GB', validity: '1 Day', costPrice: 476, finalPrice: calculatePriceWithMargin(476) },
  { id: '2gb', label: '2GB - 7 Days', dataAmount: '2GB', validity: '7 Days', costPrice: 952, finalPrice: calculatePriceWithMargin(952) },
  { id: '3gb', label: '3GB - 30 Days', dataAmount: '3GB', validity: '30 Days', costPrice: 1428, finalPrice: calculatePriceWithMargin(1428) },
  { id: '5gb', label: '5GB - 30 Days', dataAmount: '5GB', validity: '30 Days', costPrice: 1905, finalPrice: calculatePriceWithMargin(1905) },
  { id: '10gb', label: '10GB - 30 Days', dataAmount: '10GB', validity: '30 Days', costPrice: 2857, finalPrice: calculatePriceWithMargin(2857) },
];

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
