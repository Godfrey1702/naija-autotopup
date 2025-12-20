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

// Airtime plans with 5% margin applied
export interface AirtimePlan {
  id: string;
  amount: number;
  finalPrice: number;
  cashback?: number;
}

export const AIRTIME_PLANS: AirtimePlan[] = [
  { id: 'air-50', amount: 50, finalPrice: calculatePriceWithMargin(50) },
  { id: 'air-100', amount: 100, finalPrice: calculatePriceWithMargin(100) },
  { id: 'air-200', amount: 200, finalPrice: calculatePriceWithMargin(200) },
  { id: 'air-500', amount: 500, finalPrice: calculatePriceWithMargin(500), cashback: 5 },
  { id: 'air-1000', amount: 1000, finalPrice: calculatePriceWithMargin(1000), cashback: 10 },
  { id: 'air-2000', amount: 2000, finalPrice: calculatePriceWithMargin(2000), cashback: 20 },
];

// Data plan categories
export const DATA_PLAN_CATEGORIES = ['HOT', 'Daily', 'Weekly', 'Monthly', 'Always-On'] as const;
export type DataPlanCategory = typeof DATA_PLAN_CATEGORIES[number];

// Data plan structure
export interface DataPlan {
  id: string;
  dataAmount: string;
  validity: string;
  costPrice: number;
  finalPrice: number;
  category: DataPlanCategory;
  tag?: 'Best Seller' | 'Best Price' | 'Night Plan' | 'Popular';
}

// Data plans grouped by network
export const DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
  MTN: [
    // HOT deals
    { id: 'mtn-hot-1', dataAmount: '1GB', validity: '1 Day', costPrice: 271, finalPrice: calculatePriceWithMargin(271), category: 'HOT', tag: 'Best Seller' },
    { id: 'mtn-hot-2', dataAmount: '2GB', validity: '2 Days', costPrice: 542, finalPrice: calculatePriceWithMargin(542), category: 'HOT', tag: 'Popular' },
    { id: 'mtn-hot-3', dataAmount: '3.5GB', validity: '7 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'HOT', tag: 'Best Price' },
    // Daily
    { id: 'mtn-daily-1', dataAmount: '100MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), category: 'Daily' },
    { id: 'mtn-daily-2', dataAmount: '200MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Daily' },
    { id: 'mtn-daily-3', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'Daily' },
    { id: 'mtn-daily-4', dataAmount: '2GB', validity: '1 Day', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Daily' },
    // Weekly
    { id: 'mtn-weekly-1', dataAmount: '750MB', validity: '7 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Weekly' },
    { id: 'mtn-weekly-2', dataAmount: '1.5GB', validity: '7 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Weekly' },
    { id: 'mtn-weekly-3', dataAmount: '3GB', validity: '7 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Weekly' },
    { id: 'mtn-weekly-4', dataAmount: '6GB', validity: '7 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Weekly', tag: 'Best Price' },
    // Monthly
    { id: 'mtn-monthly-1', dataAmount: '1.5GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Monthly' },
    { id: 'mtn-monthly-2', dataAmount: '3GB', validity: '30 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Monthly' },
    { id: 'mtn-monthly-3', dataAmount: '6GB', validity: '30 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Monthly', tag: 'Popular' },
    { id: 'mtn-monthly-4', dataAmount: '10GB', validity: '30 Days', costPrice: 3325, finalPrice: calculatePriceWithMargin(3325), category: 'Monthly', tag: 'Best Seller' },
    { id: 'mtn-monthly-5', dataAmount: '25GB', validity: '30 Days', costPrice: 6175, finalPrice: calculatePriceWithMargin(6175), category: 'Monthly' },
    { id: 'mtn-monthly-6', dataAmount: '40GB', validity: '30 Days', costPrice: 9500, finalPrice: calculatePriceWithMargin(9500), category: 'Monthly' },
    // Always-On
    { id: 'mtn-always-1', dataAmount: '1GB', validity: 'Night', costPrice: 238, finalPrice: calculatePriceWithMargin(238), category: 'Always-On', tag: 'Night Plan' },
    { id: 'mtn-always-2', dataAmount: '2GB', validity: 'Night', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Always-On', tag: 'Night Plan' },
  ],
  Airtel: [
    // HOT deals
    { id: 'airtel-hot-1', dataAmount: '1GB', validity: '1 Day', costPrice: 271, finalPrice: calculatePriceWithMargin(271), category: 'HOT', tag: 'Best Seller' },
    { id: 'airtel-hot-2', dataAmount: '2GB', validity: '2 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'HOT', tag: 'Popular' },
    { id: 'airtel-hot-3', dataAmount: '3GB', validity: '7 Days', costPrice: 855, finalPrice: calculatePriceWithMargin(855), category: 'HOT', tag: 'Best Price' },
    // Daily
    { id: 'airtel-daily-1', dataAmount: '100MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), category: 'Daily' },
    { id: 'airtel-daily-2', dataAmount: '200MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Daily' },
    { id: 'airtel-daily-3', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'Daily' },
    // Weekly
    { id: 'airtel-weekly-1', dataAmount: '1GB', validity: '7 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Weekly' },
    { id: 'airtel-weekly-2', dataAmount: '2GB', validity: '7 Days', costPrice: 855, finalPrice: calculatePriceWithMargin(855), category: 'Weekly' },
    { id: 'airtel-weekly-3', dataAmount: '3GB', validity: '7 Days', costPrice: 1140, finalPrice: calculatePriceWithMargin(1140), category: 'Weekly' },
    // Monthly
    { id: 'airtel-monthly-1', dataAmount: '1.5GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Monthly' },
    { id: 'airtel-monthly-2', dataAmount: '3GB', validity: '30 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Monthly' },
    { id: 'airtel-monthly-3', dataAmount: '6GB', validity: '30 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Monthly', tag: 'Popular' },
    { id: 'airtel-monthly-4', dataAmount: '10GB', validity: '30 Days', costPrice: 3325, finalPrice: calculatePriceWithMargin(3325), category: 'Monthly' },
    // Always-On
    { id: 'airtel-always-1', dataAmount: '500MB', validity: 'Night', costPrice: 238, finalPrice: calculatePriceWithMargin(238), category: 'Always-On', tag: 'Night Plan' },
  ],
  Glo: [
    // HOT deals
    { id: 'glo-hot-1', dataAmount: '1.35GB', validity: '14 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'HOT', tag: 'Best Seller' },
    { id: 'glo-hot-2', dataAmount: '2.9GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'HOT', tag: 'Best Price' },
    // Daily
    { id: 'glo-daily-1', dataAmount: '150MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), category: 'Daily' },
    { id: 'glo-daily-2', dataAmount: '350MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Daily' },
    { id: 'glo-daily-3', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'Daily' },
    // Weekly
    { id: 'glo-weekly-1', dataAmount: '1.35GB', validity: '14 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Weekly' },
    { id: 'glo-weekly-2', dataAmount: '2.5GB', validity: '7 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Weekly' },
    // Monthly
    { id: 'glo-monthly-1', dataAmount: '2.9GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Monthly' },
    { id: 'glo-monthly-2', dataAmount: '5.8GB', validity: '30 Days', costPrice: 1900, finalPrice: calculatePriceWithMargin(1900), category: 'Monthly' },
    { id: 'glo-monthly-3', dataAmount: '7.7GB', validity: '30 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Monthly', tag: 'Popular' },
    { id: 'glo-monthly-4', dataAmount: '10GB', validity: '30 Days', costPrice: 2850, finalPrice: calculatePriceWithMargin(2850), category: 'Monthly' },
    // Always-On
    { id: 'glo-always-1', dataAmount: '1GB', validity: 'Night', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Always-On', tag: 'Night Plan' },
  ],
  '9mobile': [
    // HOT deals
    { id: '9mobile-hot-1', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'HOT', tag: 'Best Seller' },
    { id: '9mobile-hot-2', dataAmount: '2.5GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'HOT', tag: 'Best Price' },
    // Daily
    { id: '9mobile-daily-1', dataAmount: '100MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), category: 'Daily' },
    { id: '9mobile-daily-2', dataAmount: '650MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Daily' },
    { id: '9mobile-daily-3', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'Daily' },
    // Weekly
    { id: '9mobile-weekly-1', dataAmount: '1.5GB', validity: '7 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Weekly' },
    { id: '9mobile-weekly-2', dataAmount: '2GB', validity: '7 Days', costPrice: 855, finalPrice: calculatePriceWithMargin(855), category: 'Weekly' },
    // Monthly
    { id: '9mobile-monthly-1', dataAmount: '2.5GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Monthly' },
    { id: '9mobile-monthly-2', dataAmount: '4GB', validity: '30 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Monthly' },
    { id: '9mobile-monthly-3', dataAmount: '11GB', validity: '30 Days', costPrice: 3325, finalPrice: calculatePriceWithMargin(3325), category: 'Monthly', tag: 'Popular' },
    // Always-On
    { id: '9mobile-always-1', dataAmount: '1GB', validity: 'Night', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Always-On', tag: 'Night Plan' },
  ],
};

// Helper to get plans by category for a network
export const getDataPlansByCategory = (
  network: NetworkProvider,
  category: DataPlanCategory
): DataPlan[] => {
  return DATA_PLANS[network].filter((plan) => plan.category === category);
};
