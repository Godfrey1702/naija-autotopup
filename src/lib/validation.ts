import { z } from 'zod';
import { PAYMENT_LIMITS, formatCurrency } from './constants';

// Nigerian phone number patterns
const NIGERIAN_PHONE_PREFIXES: Record<string, readonly string[]> = {
  MTN: ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
  Airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'],
  Glo: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
} as const;

// All valid Nigerian phone prefixes
const ALL_NIGERIAN_PREFIXES = Object.values(NIGERIAN_PHONE_PREFIXES).flat();

export type NigerianNetwork = 'MTN' | 'Airtel' | 'Glo' | '9mobile';

/**
 * Validates a Nigerian phone number
 * @returns Object with validity status, cleaned number, detected network, and error message
 */
export const validateNigerianPhoneNumber = (phoneNumber: string): {
  valid: boolean;
  cleanedNumber: string;
  detectedNetwork: NigerianNetwork | null;
  error?: string;
} => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.slice(4);
  }
  
  // Check length
  if (cleaned.length !== 11) {
    return {
      valid: false,
      cleanedNumber: cleaned,
      detectedNetwork: null,
      error: 'Phone number must be 11 digits',
    };
  }
  
  // Check if starts with valid prefix
  const prefix = cleaned.substring(0, 4);
  if (!ALL_NIGERIAN_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      cleanedNumber: cleaned,
      detectedNetwork: null,
      error: 'Invalid Nigerian phone number prefix',
    };
  }
  
  // Detect network
  let detectedNetwork: NigerianNetwork | null = null;
  for (const [network, prefixes] of Object.entries(NIGERIAN_PHONE_PREFIXES)) {
    if (prefixes.includes(prefix)) {
      detectedNetwork = network as NigerianNetwork;
      break;
    }
  }
  
  return {
    valid: true,
    cleanedNumber: cleaned,
    detectedNetwork,
  };
};

/**
 * Validates purchase amount
 */
export const validatePurchaseAmount = (
  amount: number,
  walletBalance: number,
  type: 'airtime' | 'data'
): { valid: boolean; error?: string } => {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Please enter a valid amount' };
  }
  
  if (amount < PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT) {
    return {
      valid: false,
      error: `Minimum ${type} amount is ${formatCurrency(PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT)}`,
    };
  }
  
  // Max airtime purchase limit
  const maxPurchase = type === 'airtime' ? 50000 : 100000;
  if (amount > maxPurchase) {
    return {
      valid: false,
      error: `Maximum ${type} purchase is ${formatCurrency(maxPurchase)}`,
    };
  }
  
  if (amount > walletBalance) {
    return {
      valid: false,
      error: `Insufficient balance. You have ${formatCurrency(walletBalance)}`,
    };
  }
  
  return { valid: true };
};

// Zod schema for purchase validation
export const purchaseSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Phone number is too short')
    .max(15, 'Phone number is too long')
    .refine((val) => validateNigerianPhoneNumber(val).valid, {
      message: 'Invalid Nigerian phone number',
    }),
  amount: z
    .number()
    .min(PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT, `Minimum amount is ₦${PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT}`)
    .max(100000, 'Maximum amount is ₦100,000'),
  type: z.enum(['airtime', 'data']),
  network: z.string().min(1, 'Network is required'),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

/**
 * Get network from phone number
 */
export const getNetworkFromPhone = (phone: string): NigerianNetwork | null => {
  const { detectedNetwork } = validateNigerianPhoneNumber(phone);
  return detectedNetwork;
};

// Error codes and messages for user-friendly feedback
export const ERROR_CODES = {
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PURCHASE_FAILED: 'PURCHASE_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const ERROR_MESSAGES: Record<keyof typeof ERROR_CODES, string> = {
  INVALID_PHONE: 'Please enter a valid Nigerian phone number',
  INVALID_AMOUNT: 'Please enter a valid amount',
  INSUFFICIENT_BALANCE: 'You don\'t have enough balance for this purchase',
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection',
  AUTH_ERROR: 'Session expired. Please log in again',
  PURCHASE_FAILED: 'Purchase could not be completed. Please try again',
  UNKNOWN_ERROR: 'Something went wrong. Please try again later',
};

/**
 * Parse API error response to user-friendly message
 */
export const parseApiError = (error: unknown): { code: keyof typeof ERROR_CODES; message: string } => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('phone') || message.includes('number')) {
      return { code: 'INVALID_PHONE', message: ERROR_MESSAGES.INVALID_PHONE };
    }
    if (message.includes('amount') || message.includes('balance')) {
      return { code: 'INSUFFICIENT_BALANCE', message: ERROR_MESSAGES.INSUFFICIENT_BALANCE };
    }
    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return { code: 'AUTH_ERROR', message: ERROR_MESSAGES.AUTH_ERROR };
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return { code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR };
    }
  }
  
  return { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR };
};
