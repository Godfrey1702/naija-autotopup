/**
 * @fileoverview Application Constants
 * 
 * This module defines all application constants including payment limits,
 * pricing margins, network providers, and data plan definitions.
 * 
 * ## Payment Limits
 * - Minimum top-up: ₦5,000
 * - Maximum wallet balance: ₦8,000,000
 * - Minimum purchase: ₦100
 * 
 * ## Pricing
 * All prices include a 5% margin over base cost from the VTU provider.
 * 
 * ## Network Providers
 * Supports all major Nigerian networks: MTN, Airtel, Glo, 9mobile
 * 
 * @module constants
 */

/**
 * Payment limits for compliance and business rules.
 * These limits are enforced both client-side (for UX) and server-side (for security).
 * 
 * @constant
 */
export const PAYMENT_LIMITS = {
  /** Minimum wallet top-up amount in NGN */
  MIN_TOPUP_AMOUNT: 5000,
  /** Maximum wallet balance allowed in NGN */
  MAX_WALLET_BALANCE: 8000000,
  /** Minimum purchase amount for airtime/data in NGN */
  MIN_PURCHASE_AMOUNT: 100,
} as const;

/**
 * Pricing margin applied to all VTU purchases.
 * This margin covers operational costs and provides revenue.
 * 
 * @constant
 */
export const PRICING_MARGIN = 0.05;

/**
 * Calculates the final price with margin applied.
 * 
 * @param {number} costPrice - Base cost from VTU provider
 * @returns {number} Final price rounded up to nearest naira
 * 
 * @example
 * const finalPrice = calculatePriceWithMargin(1000);
 * console.log(finalPrice); // 1050
 */
export const calculatePriceWithMargin = (costPrice: number): number => {
  return Math.ceil(costPrice * (1 + PRICING_MARGIN));
};

/**
 * List of supported Nigerian mobile network providers.
 * 
 * @constant
 */
export const NETWORK_PROVIDERS = ['MTN', 'Airtel', 'Glo', '9mobile'] as const;

/**
 * Type definition for network providers.
 */
export type NetworkProvider = typeof NETWORK_PROVIDERS[number];

/**
 * Formats a number as Nigerian Naira currency.
 * 
 * @param {number} amount - Amount in NGN
 * @returns {string} Formatted currency string (e.g., "₦10,000")
 * 
 * @example
 * formatCurrency(10000); // "₦10,000"
 */
export const formatCurrency = (amount: number): string => {
  return `₦${amount.toLocaleString("en-NG")}`;
};

/**
 * Validates a top-up amount against payment limits.
 * 
 * @param {number} amount - Amount to top up
 * @param {number} currentBalance - Current wallet balance
 * @returns {{ valid: boolean; error?: string }} Validation result
 * 
 * @example
 * const result = validateTopUp(5000, 7000000);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export const validateTopUp = (
  amount: number,
  currentBalance: number
): { valid: boolean; error?: string } => {
  // Check minimum amount
  if (amount < PAYMENT_LIMITS.MIN_TOPUP_AMOUNT) {
    return {
      valid: false,
      error: `Minimum top-up amount is ${formatCurrency(PAYMENT_LIMITS.MIN_TOPUP_AMOUNT)}`,
    };
  }

  // Check if resulting balance would exceed maximum
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

/**
 * Airtime plan structure with pricing.
 * 
 * @interface AirtimePlan
 */
export interface AirtimePlan {
  /** Unique plan identifier */
  id: string;
  /** Base airtime amount in NGN */
  amount: number;
  /** Final price with margin */
  finalPrice: number;
  /** Cashback percentage (optional) */
  cashback?: number;
}

/**
 * Predefined airtime plans with 5% margin applied.
 * Higher amounts offer cashback incentives.
 * 
 * @constant
 */
export const AIRTIME_PLANS: AirtimePlan[] = [
  { id: 'air-50', amount: 50, finalPrice: calculatePriceWithMargin(50) },
  { id: 'air-100', amount: 100, finalPrice: calculatePriceWithMargin(100) },
  { id: 'air-200', amount: 200, finalPrice: calculatePriceWithMargin(200) },
  { id: 'air-500', amount: 500, finalPrice: calculatePriceWithMargin(500), cashback: 5 },
  { id: 'air-1000', amount: 1000, finalPrice: calculatePriceWithMargin(1000), cashback: 10 },
  { id: 'air-2000', amount: 2000, finalPrice: calculatePriceWithMargin(2000), cashback: 20 },
];

/**
 * Data plan categories for organization.
 * 
 * @constant
 */
export const DATA_PLAN_CATEGORIES = ['HOT', 'Daily', 'Weekly', 'Monthly', 'Always-On'] as const;

/**
 * Type definition for data plan categories.
 */
export type DataPlanCategory = typeof DATA_PLAN_CATEGORIES[number];

/**
 * Data plan structure with full pricing and details.
 * 
 * @interface DataPlan
 */
export interface DataPlan {
  /** Unique plan identifier */
  id: string;
  /** Data allocation (e.g., "1GB") */
  dataAmount: string;
  /** Validity period (e.g., "30 days") */
  validity: string;
  /** Base cost from provider in NGN */
  costPrice: number;
  /** Final price with margin */
  finalPrice: number;
  /** Plan category for filtering */
  category: DataPlanCategory;
  /** Optional promotional tag */
  tag?: 'Best Seller' | 'Best Price' | 'Night Plan' | 'Popular';
}

/**
 * Data plans organized by network provider.
 * Each network has plans across all categories with 5% margin applied.
 * 
 * @constant
 */
export const DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
  MTN: [
    // HOT deals - promotional offers
    { id: 'mtn-hot-1', dataAmount: '1GB', validity: '1 Day', costPrice: 271, finalPrice: calculatePriceWithMargin(271), category: 'HOT', tag: 'Best Seller' },
    { id: 'mtn-hot-2', dataAmount: '2GB', validity: '2 Days', costPrice: 542, finalPrice: calculatePriceWithMargin(542), category: 'HOT', tag: 'Popular' },
    { id: 'mtn-hot-3', dataAmount: '3.5GB', validity: '7 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'HOT', tag: 'Best Price' },
    // Daily plans
    { id: 'mtn-daily-1', dataAmount: '100MB', validity: '1 Day', costPrice: 95, finalPrice: calculatePriceWithMargin(95), category: 'Daily' },
    { id: 'mtn-daily-2', dataAmount: '200MB', validity: '1 Day', costPrice: 190, finalPrice: calculatePriceWithMargin(190), category: 'Daily' },
    { id: 'mtn-daily-3', dataAmount: '1GB', validity: '1 Day', costPrice: 285, finalPrice: calculatePriceWithMargin(285), category: 'Daily' },
    { id: 'mtn-daily-4', dataAmount: '2GB', validity: '1 Day', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Daily' },
    // Weekly plans
    { id: 'mtn-weekly-1', dataAmount: '750MB', validity: '7 Days', costPrice: 475, finalPrice: calculatePriceWithMargin(475), category: 'Weekly' },
    { id: 'mtn-weekly-2', dataAmount: '1.5GB', validity: '7 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Weekly' },
    { id: 'mtn-weekly-3', dataAmount: '3GB', validity: '7 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Weekly' },
    { id: 'mtn-weekly-4', dataAmount: '6GB', validity: '7 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Weekly', tag: 'Best Price' },
    // Monthly plans
    { id: 'mtn-monthly-1', dataAmount: '1.5GB', validity: '30 Days', costPrice: 950, finalPrice: calculatePriceWithMargin(950), category: 'Monthly' },
    { id: 'mtn-monthly-2', dataAmount: '3GB', validity: '30 Days', costPrice: 1425, finalPrice: calculatePriceWithMargin(1425), category: 'Monthly' },
    { id: 'mtn-monthly-3', dataAmount: '6GB', validity: '30 Days', costPrice: 2375, finalPrice: calculatePriceWithMargin(2375), category: 'Monthly', tag: 'Popular' },
    { id: 'mtn-monthly-4', dataAmount: '10GB', validity: '30 Days', costPrice: 3325, finalPrice: calculatePriceWithMargin(3325), category: 'Monthly', tag: 'Best Seller' },
    { id: 'mtn-monthly-5', dataAmount: '25GB', validity: '30 Days', costPrice: 6175, finalPrice: calculatePriceWithMargin(6175), category: 'Monthly' },
    { id: 'mtn-monthly-6', dataAmount: '40GB', validity: '30 Days', costPrice: 9500, finalPrice: calculatePriceWithMargin(9500), category: 'Monthly' },
    // Always-On / Night plans
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

/**
 * Helper function to get data plans by category for a specific network.
 * 
 * @param {NetworkProvider} network - Network provider
 * @param {DataPlanCategory} category - Plan category
 * @returns {DataPlan[]} Filtered list of plans
 * 
 * @example
 * const mtnMonthlyPlans = getDataPlansByCategory('MTN', 'Monthly');
 */
export const getDataPlansByCategory = (
  network: NetworkProvider,
  category: DataPlanCategory
): DataPlan[] => {
  return DATA_PLANS[network].filter((plan) => plan.category === category);
};
