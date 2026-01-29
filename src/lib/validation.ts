/**
 * @fileoverview Validation Utilities
 * 
 * This module provides validation functions for Nigerian phone numbers,
 * purchase amounts, and API error parsing. All validations follow Nigerian
 * telecommunications standards.
 * 
 * ## Phone Number Validation
 * - Validates 11-digit Nigerian phone numbers
 * - Supports formats: 08012345678, 234XXXXXXXXXX, +234XXXXXXXXXX
 * - Detects network provider from prefix
 * 
 * ## Amount Validation
 * - Enforces minimum and maximum purchase limits
 * - Checks against wallet balance
 * 
 * ## Error Handling
 * - Parses API errors into user-friendly messages
 * - Maps common error patterns to specific error codes
 * 
 * @module validation
 */

import { z } from 'zod';
import { PAYMENT_LIMITS, formatCurrency } from './constants';

/**
 * Nigerian phone number prefixes organized by network provider.
 * Each network has unique 4-digit prefixes that identify the carrier.
 * 
 * @constant
 */
const NIGERIAN_PHONE_PREFIXES: Record<string, readonly string[]> = {
  MTN: ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
  Airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'],
  Glo: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
} as const;

/** All valid Nigerian phone prefixes flattened */
const ALL_NIGERIAN_PREFIXES = Object.values(NIGERIAN_PHONE_PREFIXES).flat();

/**
 * Type definition for Nigerian network providers.
 */
export type NigerianNetwork = 'MTN' | 'Airtel' | 'Glo' | '9mobile';

/**
 * Validates a Nigerian phone number and detects the network provider.
 * 
 * Accepts multiple input formats:
 * - Local format: 08012345678
 * - International: 234XXXXXXXXXX
 * - With plus: +234XXXXXXXXXX
 * 
 * @param {string} phoneNumber - Phone number to validate (any format)
 * @returns {Object} Validation result with cleaned number and detected network
 * 
 * @example
 * // Valid number
 * const result = validateNigerianPhoneNumber("08031234567");
 * // { valid: true, cleanedNumber: "08031234567", detectedNetwork: "MTN" }
 * 
 * // Invalid number
 * const result = validateNigerianPhoneNumber("123");
 * // { valid: false, cleanedNumber: "123", detectedNetwork: null, error: "..." }
 */
export const validateNigerianPhoneNumber = (phoneNumber: string): {
  valid: boolean;
  cleanedNumber: string;
  detectedNetwork: NigerianNetwork | null;
  error?: string;
} => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Normalize international format to local format
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.slice(4);
  }
  
  // Validate length (Nigerian numbers are 11 digits in local format)
  if (cleaned.length !== 11) {
    return {
      valid: false,
      cleanedNumber: cleaned,
      detectedNetwork: null,
      error: 'Phone number must be 11 digits',
    };
  }
  
  // Extract and validate prefix
  const prefix = cleaned.substring(0, 4);
  if (!ALL_NIGERIAN_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      cleanedNumber: cleaned,
      detectedNetwork: null,
      error: 'Invalid Nigerian phone number prefix',
    };
  }
  
  // Detect network from prefix
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
 * Validates a purchase amount against limits and wallet balance.
 * 
 * Checks:
 * - Amount is a positive number
 * - Amount meets minimum requirement
 * - Amount doesn't exceed maximum for purchase type
 * - Sufficient wallet balance
 * 
 * @param {number} amount - Amount to validate
 * @param {number} walletBalance - Current wallet balance
 * @param {'airtime' | 'data'} type - Purchase type (affects max limit)
 * @returns {{ valid: boolean; error?: string }} Validation result
 * 
 * @example
 * const result = validatePurchaseAmount(500, 10000, 'airtime');
 * // { valid: true }
 * 
 * const result = validatePurchaseAmount(100000, 10000, 'airtime');
 * // { valid: false, error: "Insufficient balance..." }
 */
export const validatePurchaseAmount = (
  amount: number,
  walletBalance: number,
  type: 'airtime' | 'data'
): { valid: boolean; error?: string } => {
  // Check for valid number
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Please enter a valid amount' };
  }
  
  // Check minimum amount
  if (amount < PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT) {
    return {
      valid: false,
      error: `Minimum ${type} amount is ${formatCurrency(PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT)}`,
    };
  }
  
  // Check maximum amount (different for airtime vs data)
  const maxPurchase = type === 'airtime' ? 50000 : 100000;
  if (amount > maxPurchase) {
    return {
      valid: false,
      error: `Maximum ${type} purchase is ${formatCurrency(maxPurchase)}`,
    };
  }
  
  // Check wallet balance
  if (amount > walletBalance) {
    return {
      valid: false,
      error: `Insufficient balance. You have ${formatCurrency(walletBalance)}`,
    };
  }
  
  return { valid: true };
};

/**
 * Zod schema for purchase form validation.
 * Provides declarative validation with type inference.
 * 
 * @constant
 */
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

/**
 * TypeScript type inferred from the purchase schema.
 */
export type PurchaseInput = z.infer<typeof purchaseSchema>;

/**
 * Formats a phone number for display with spaces.
 * 
 * @param {string} phone - Phone number (11 digits)
 * @returns {string} Formatted phone number (e.g., "0803 123 4567")
 * 
 * @example
 * formatPhoneNumber("08031234567"); // "0803 123 4567"
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

/**
 * Gets the network provider from a phone number.
 * Convenience wrapper around validateNigerianPhoneNumber.
 * 
 * @param {string} phone - Phone number to check
 * @returns {NigerianNetwork | null} Network provider or null if invalid
 * 
 * @example
 * getNetworkFromPhone("08031234567"); // "MTN"
 */
export const getNetworkFromPhone = (phone: string): NigerianNetwork | null => {
  const { detectedNetwork } = validateNigerianPhoneNumber(phone);
  return detectedNetwork;
};

/**
 * Error code constants for standardized error handling.
 * 
 * @constant
 */
export const ERROR_CODES = {
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PURCHASE_FAILED: 'PURCHASE_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * User-friendly error messages for each error code.
 * 
 * @constant
 */
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
 * Parses an API error into a user-friendly error code and message.
 * Analyzes error message content to determine the appropriate error type.
 * 
 * @param {unknown} error - Error from API call
 * @returns {{ code: string; message: string }} Parsed error with user-friendly message
 * 
 * @example
 * try {
 *   await purchaseAirtime();
 * } catch (error) {
 *   const { code, message } = parseApiError(error);
 *   toast.error(message);
 *   analytics.track('purchase_error', { code });
 * }
 */
export const parseApiError = (error: unknown): { code: keyof typeof ERROR_CODES; message: string } => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Pattern matching for specific error types
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
  
  // Default to unknown error
  return { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR };
};
