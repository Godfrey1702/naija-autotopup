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

// Data plan categories
export const DATA_PLAN_CATEGORIES = ['HOT', 'Daily', 'Weekly', 'Monthly', 'Always-On'] as const;
export type DataPlanCategory = typeof DATA_PLAN_CATEGORIES[number];

// Data plans with cost prices and calculated final prices
export interface DataPlan {
  id: string;
  label: string;
  dataAmount: string;
  validity: string;
  costPrice: number;
  finalPrice: number;
  network?: NetworkProvider;
  category: DataPlanCategory;
  tag?: string; // e.g., "Best Price", "Night Plan"
}

// Airtime plans with preset amounts
export interface AirtimePlan {
  id: string;
  amount: number;
  costPrice: number;
  finalPrice: number;
  cashback?: string;
}

// Airtime presets with 5% margin applied
export const AIRTIME_PLANS: AirtimePlan[] = [
  { id: 'airtime-50', amount: 50, costPrice: 48, finalPrice: calculatePriceWithMargin(48) },
  { id: 'airtime-100', amount: 100, costPrice: 95, finalPrice: calculatePriceWithMargin(95) },
  { id: 'airtime-200', amount: 200, costPrice: 190, finalPrice: calculatePriceWithMargin(190), cashback: '+₦5 bonus' },
  { id: 'airtime-500', amount: 500, costPrice: 476, finalPrice: calculatePriceWithMargin(476), cashback: '+₦15 bonus' },
  { id: 'airtime-1000', amount: 1000, costPrice: 952, finalPrice: calculatePriceWithMargin(952), cashback: '+₦30 bonus' },
  { id: 'airtime-2000', amount: 2000, costPrice: 1905, finalPrice: calculatePriceWithMargin(1905), cashback: '+₦60 bonus' },
];

// Legacy airtime presets for backward compatibility
export const AIRTIME_PRESETS = [500, 1000, 2000] as const;

// Data plans by network (mock prices - will be replaced by Payflex API)
export const DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
  MTN: [
    // HOT plans
    { id: 'mtn-hot-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), network: 'MTN', category: 'HOT', tag: 'Best Seller' },
    { id: 'mtn-hot-2gb', label: '2GB', dataAmount: '2GB', validity: '3 Days', costPrice: 476, finalPrice: calculatePriceWithMargin(476), network: 'MTN', category: 'HOT' },
    // Daily plans
    { id: 'mtn-daily-100mb', label: '100MB', dataAmount: '100MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), network: 'MTN', category: 'Daily' },
    { id: 'mtn-daily-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), network: 'MTN', category: 'Daily' },
    { id: 'mtn-daily-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), network: 'MTN', category: 'Daily' },
    { id: 'mtn-daily-1.5gb', label: '1.5GB', dataAmount: '1.5GB', validity: '1 Day', costPrice: 380, finalPrice: calculatePriceWithMargin(380), network: 'MTN', category: 'Daily', tag: 'Night Plan' },
    // Weekly plans
    { id: 'mtn-weekly-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 952, finalPrice: calculatePriceWithMargin(952), network: 'MTN', category: 'Weekly' },
    { id: 'mtn-weekly-3gb', label: '3GB', dataAmount: '3GB', validity: '7 Days', costPrice: 1143, finalPrice: calculatePriceWithMargin(1143), network: 'MTN', category: 'Weekly', tag: 'Best Price' },
    { id: 'mtn-weekly-5gb', label: '5GB', dataAmount: '5GB', validity: '7 Days', costPrice: 1429, finalPrice: calculatePriceWithMargin(1429), network: 'MTN', category: 'Weekly' },
    // Monthly plans
    { id: 'mtn-monthly-3gb', label: '3GB', dataAmount: '3GB', validity: '30 Days', costPrice: 1429, finalPrice: calculatePriceWithMargin(1429), network: 'MTN', category: 'Monthly' },
    { id: 'mtn-monthly-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1905, finalPrice: calculatePriceWithMargin(1905), network: 'MTN', category: 'Monthly' },
    { id: 'mtn-monthly-10gb', label: '10GB', dataAmount: '10GB', validity: '30 Days', costPrice: 2857, finalPrice: calculatePriceWithMargin(2857), network: 'MTN', category: 'Monthly', tag: 'Popular' },
    { id: 'mtn-monthly-20gb', label: '20GB', dataAmount: '20GB', validity: '30 Days', costPrice: 4762, finalPrice: calculatePriceWithMargin(4762), network: 'MTN', category: 'Monthly' },
    // Always-On plans
    { id: 'mtn-always-75gb', label: '75GB', dataAmount: '75GB', validity: '30 Days', costPrice: 14286, finalPrice: calculatePriceWithMargin(14286), network: 'MTN', category: 'Always-On' },
    { id: 'mtn-always-120gb', label: '120GB', dataAmount: '120GB', validity: '30 Days', costPrice: 19048, finalPrice: calculatePriceWithMargin(19048), network: 'MTN', category: 'Always-On', tag: 'Best Value' },
  ],
  Airtel: [
    // HOT plans
    { id: 'airtel-hot-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 270, finalPrice: calculatePriceWithMargin(270), network: 'Airtel', category: 'HOT', tag: 'Best Seller' },
    { id: 'airtel-hot-2gb', label: '2GB', dataAmount: '2GB', validity: '3 Days', costPrice: 450, finalPrice: calculatePriceWithMargin(450), network: 'Airtel', category: 'HOT' },
    // Daily plans
    { id: 'airtel-daily-100mb', label: '100MB', dataAmount: '100MB', validity: '1 Day', costPrice: 90, finalPrice: calculatePriceWithMargin(90), network: 'Airtel', category: 'Daily' },
    { id: 'airtel-daily-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 180, finalPrice: calculatePriceWithMargin(180), network: 'Airtel', category: 'Daily' },
    { id: 'airtel-daily-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 270, finalPrice: calculatePriceWithMargin(270), network: 'Airtel', category: 'Daily' },
    // Weekly plans
    { id: 'airtel-weekly-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 900, finalPrice: calculatePriceWithMargin(900), network: 'Airtel', category: 'Weekly' },
    { id: 'airtel-weekly-3gb', label: '3GB', dataAmount: '3GB', validity: '7 Days', costPrice: 1080, finalPrice: calculatePriceWithMargin(1080), network: 'Airtel', category: 'Weekly', tag: 'Best Price' },
    { id: 'airtel-weekly-5gb', label: '5GB', dataAmount: '5GB', validity: '7 Days', costPrice: 1350, finalPrice: calculatePriceWithMargin(1350), network: 'Airtel', category: 'Weekly' },
    // Monthly plans
    { id: 'airtel-monthly-3gb', label: '3GB', dataAmount: '3GB', validity: '30 Days', costPrice: 1350, finalPrice: calculatePriceWithMargin(1350), network: 'Airtel', category: 'Monthly' },
    { id: 'airtel-monthly-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1800, finalPrice: calculatePriceWithMargin(1800), network: 'Airtel', category: 'Monthly' },
    { id: 'airtel-monthly-10gb', label: '10GB', dataAmount: '10GB', validity: '30 Days', costPrice: 2700, finalPrice: calculatePriceWithMargin(2700), network: 'Airtel', category: 'Monthly', tag: 'Popular' },
    { id: 'airtel-monthly-20gb', label: '20GB', dataAmount: '20GB', validity: '30 Days', costPrice: 4500, finalPrice: calculatePriceWithMargin(4500), network: 'Airtel', category: 'Monthly' },
    // Always-On plans
    { id: 'airtel-always-75gb', label: '75GB', dataAmount: '75GB', validity: '30 Days', costPrice: 13500, finalPrice: calculatePriceWithMargin(13500), network: 'Airtel', category: 'Always-On' },
    { id: 'airtel-always-120gb', label: '120GB', dataAmount: '120GB', validity: '30 Days', costPrice: 18000, finalPrice: calculatePriceWithMargin(18000), network: 'Airtel', category: 'Always-On', tag: 'Best Value' },
  ],
  Glo: [
    // HOT plans
    { id: 'glo-hot-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 250, finalPrice: calculatePriceWithMargin(250), network: 'Glo', category: 'HOT', tag: 'Best Seller' },
    { id: 'glo-hot-2gb', label: '2GB', dataAmount: '2GB', validity: '3 Days', costPrice: 420, finalPrice: calculatePriceWithMargin(420), network: 'Glo', category: 'HOT' },
    // Daily plans
    { id: 'glo-daily-100mb', label: '100MB', dataAmount: '100MB', validity: '1 Day', costPrice: 85, finalPrice: calculatePriceWithMargin(85), network: 'Glo', category: 'Daily' },
    { id: 'glo-daily-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 170, finalPrice: calculatePriceWithMargin(170), network: 'Glo', category: 'Daily' },
    { id: 'glo-daily-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 250, finalPrice: calculatePriceWithMargin(250), network: 'Glo', category: 'Daily' },
    // Weekly plans
    { id: 'glo-weekly-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 850, finalPrice: calculatePriceWithMargin(850), network: 'Glo', category: 'Weekly' },
    { id: 'glo-weekly-3gb', label: '3GB', dataAmount: '3GB', validity: '7 Days', costPrice: 1020, finalPrice: calculatePriceWithMargin(1020), network: 'Glo', category: 'Weekly', tag: 'Best Price' },
    { id: 'glo-weekly-5gb', label: '5GB', dataAmount: '5GB', validity: '7 Days', costPrice: 1275, finalPrice: calculatePriceWithMargin(1275), network: 'Glo', category: 'Weekly' },
    // Monthly plans
    { id: 'glo-monthly-3gb', label: '3GB', dataAmount: '3GB', validity: '30 Days', costPrice: 1275, finalPrice: calculatePriceWithMargin(1275), network: 'Glo', category: 'Monthly' },
    { id: 'glo-monthly-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1700, finalPrice: calculatePriceWithMargin(1700), network: 'Glo', category: 'Monthly' },
    { id: 'glo-monthly-10gb', label: '10GB', dataAmount: '10GB', validity: '30 Days', costPrice: 2550, finalPrice: calculatePriceWithMargin(2550), network: 'Glo', category: 'Monthly', tag: 'Popular' },
    { id: 'glo-monthly-20gb', label: '20GB', dataAmount: '20GB', validity: '30 Days', costPrice: 4250, finalPrice: calculatePriceWithMargin(4250), network: 'Glo', category: 'Monthly' },
    // Always-On plans
    { id: 'glo-always-75gb', label: '75GB', dataAmount: '75GB', validity: '30 Days', costPrice: 12750, finalPrice: calculatePriceWithMargin(12750), network: 'Glo', category: 'Always-On' },
    { id: 'glo-always-120gb', label: '120GB', dataAmount: '120GB', validity: '30 Days', costPrice: 17000, finalPrice: calculatePriceWithMargin(17000), network: 'Glo', category: 'Always-On', tag: 'Best Value' },
  ],
  '9mobile': [
    // HOT plans
    { id: '9mobile-hot-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 260, finalPrice: calculatePriceWithMargin(260), network: '9mobile', category: 'HOT', tag: 'Best Seller' },
    { id: '9mobile-hot-2gb', label: '2GB', dataAmount: '2GB', validity: '3 Days', costPrice: 440, finalPrice: calculatePriceWithMargin(440), network: '9mobile', category: 'HOT' },
    // Daily plans
    { id: '9mobile-daily-100mb', label: '100MB', dataAmount: '100MB', validity: '1 Day', costPrice: 88, finalPrice: calculatePriceWithMargin(88), network: '9mobile', category: 'Daily' },
    { id: '9mobile-daily-500mb', label: '500MB', dataAmount: '500MB', validity: '1 Day', costPrice: 176, finalPrice: calculatePriceWithMargin(176), network: '9mobile', category: 'Daily' },
    { id: '9mobile-daily-1gb', label: '1GB', dataAmount: '1GB', validity: '1 Day', costPrice: 260, finalPrice: calculatePriceWithMargin(260), network: '9mobile', category: 'Daily' },
    // Weekly plans
    { id: '9mobile-weekly-2gb', label: '2GB', dataAmount: '2GB', validity: '7 Days', costPrice: 880, finalPrice: calculatePriceWithMargin(880), network: '9mobile', category: 'Weekly' },
    { id: '9mobile-weekly-3gb', label: '3GB', dataAmount: '3GB', validity: '7 Days', costPrice: 1056, finalPrice: calculatePriceWithMargin(1056), network: '9mobile', category: 'Weekly', tag: 'Best Price' },
    { id: '9mobile-weekly-5gb', label: '5GB', dataAmount: '5GB', validity: '7 Days', costPrice: 1320, finalPrice: calculatePriceWithMargin(1320), network: '9mobile', category: 'Weekly' },
    // Monthly plans
    { id: '9mobile-monthly-3gb', label: '3GB', dataAmount: '3GB', validity: '30 Days', costPrice: 1320, finalPrice: calculatePriceWithMargin(1320), network: '9mobile', category: 'Monthly' },
    { id: '9mobile-monthly-5gb', label: '5GB', dataAmount: '5GB', validity: '30 Days', costPrice: 1750, finalPrice: calculatePriceWithMargin(1750), network: '9mobile', category: 'Monthly' },
    { id: '9mobile-monthly-10gb', label: '10GB', dataAmount: '10GB', validity: '30 Days', costPrice: 2640, finalPrice: calculatePriceWithMargin(2640), network: '9mobile', category: 'Monthly', tag: 'Popular' },
    { id: '9mobile-monthly-20gb', label: '20GB', dataAmount: '20GB', validity: '30 Days', costPrice: 4400, finalPrice: calculatePriceWithMargin(4400), network: '9mobile', category: 'Monthly' },
    // Always-On plans
    { id: '9mobile-always-75gb', label: '75GB', dataAmount: '75GB', validity: '30 Days', costPrice: 13200, finalPrice: calculatePriceWithMargin(13200), network: '9mobile', category: 'Always-On' },
    { id: '9mobile-always-120gb', label: '120GB', dataAmount: '120GB', validity: '30 Days', costPrice: 17600, finalPrice: calculatePriceWithMargin(17600), network: '9mobile', category: 'Always-On', tag: 'Best Value' },
  ],
};

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

// Get plans by category for a network
export const getDataPlansByCategory = (network: NetworkProvider, category: DataPlanCategory): DataPlan[] => {
  return DATA_PLANS[network].filter(plan => plan.category === category);
};