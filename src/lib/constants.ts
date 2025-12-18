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

// Nigerian mobile network providers
export const NETWORK_PROVIDERS = ['MTN', 'Airtel', 'Glo', '9mobile'] as const;
export type NetworkProvider = typeof NETWORK_PROVIDERS[number];

// Data plans with cost prices and calculated final prices
export interface DataPlan {
  id: string;
  label: string;
  dataAmount: string;
  validity: string;
  costPrice: number;
  finalPrice: number;
  network?: NetworkProvider; // Optional - if not set, available for all networks
}

// Data plans by network (mock prices - will be replaced by Payflex API)
export const DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
  MTN: [
    { id: 'mtn-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), network: 'MTN' },
    { id: 'mtn-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 476, finalPrice: calculatePriceWithMargin(476), network: 'MTN' },
    { id: 'mtn-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 952, finalPrice: calculatePriceWithMargin(952), network: 'MTN' },
    { id: 'mtn-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1905, finalPrice: calculatePriceWithMargin(1905), network: 'MTN' },
  ],
  Airtel: [
    { id: 'airtel-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 270, finalPrice: calculatePriceWithMargin(270), network: 'Airtel' },
    { id: 'airtel-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 450, finalPrice: calculatePriceWithMargin(450), network: 'Airtel' },
    { id: 'airtel-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 900, finalPrice: calculatePriceWithMargin(900), network: 'Airtel' },
    { id: 'airtel-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1800, finalPrice: calculatePriceWithMargin(1800), network: 'Airtel' },
  ],
  Glo: [
    { id: 'glo-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 250, finalPrice: calculatePriceWithMargin(250), network: 'Glo' },
    { id: 'glo-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 420, finalPrice: calculatePriceWithMargin(420), network: 'Glo' },
    { id: 'glo-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 850, finalPrice: calculatePriceWithMargin(850), network: 'Glo' },
    { id: 'glo-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1700, finalPrice: calculatePriceWithMargin(1700), network: 'Glo' },
  ],
  '9mobile': [
    { id: '9mobile-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 260, finalPrice: calculatePriceWithMargin(260), network: '9mobile' },
    { id: '9mobile-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 440, finalPrice: calculatePriceWithMargin(440), network: '9mobile' },
    { id: '9mobile-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 880, finalPrice: calculatePriceWithMargin(880), network: '9mobile' },
    { id: '9mobile-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1750, finalPrice: calculatePriceWithMargin(1750), network: '9mobile' },
  ],
};

// Airtime preset amounts
export const AIRTIME_PRESETS = [500, 1000, 2000] as const;

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
