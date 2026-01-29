/**
 * @fileoverview Purchase Validation Hook
 * 
 * This hook provides comprehensive validation for airtime and data purchases.
 * It validates phone numbers against Nigerian network prefixes and ensures
 * amounts are within acceptable limits and wallet balance.
 * 
 * ## Validation Features
 * - Nigerian phone number format validation (11 digits)
 * - Network provider detection from phone prefix
 * - Amount range validation (min/max limits)
 * - Wallet balance checking
 * - Touch-based error display (errors only show after interaction)
 * 
 * ## Supported Networks
 * - MTN: 0703, 0706, 0803, 0806, 0810, 0813, 0814, 0816, 0903, 0906, 0913, 0916
 * - Airtel: 0701, 0708, 0802, 0808, 0812, 0901, 0902, 0904, 0907, 0912
 * - Glo: 0705, 0805, 0807, 0811, 0815, 0905, 0915
 * - 9mobile: 0809, 0817, 0818, 0908, 0909
 * 
 * @example
 * import { usePurchaseValidation } from "@/hooks/usePurchaseValidation";
 * 
 * function PurchaseForm() {
 *   const { wallet } = useWallet();
 *   const {
 *     validation,
 *     errors,
 *     isFormValid,
 *     setPhoneNumber,
 *     setAmount,
 *   } = usePurchaseValidation({
 *     walletBalance: wallet?.balance || 0,
 *     purchaseType: "airtime",
 *   });
 *   
 *   return (
 *     <form>
 *       <Input
 *         value={validation.phoneNumber.value}
 *         onChange={(e) => setPhoneNumber(e.target.value)}
 *         error={errors.phone}
 *       />
 *       {validation.phoneNumber.detectedNetwork && (
 *         <Badge>{validation.phoneNumber.detectedNetwork}</Badge>
 *       )}
 *       <Button disabled={!isFormValid}>Purchase</Button>
 *     </form>
 *   );
 * }
 * 
 * @module usePurchaseValidation
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  validateNigerianPhoneNumber, 
  validatePurchaseAmount,
  getNetworkFromPhone,
  formatPhoneNumber,
} from '@/lib/validation';
import type { NetworkProvider } from '@/lib/constants';

/**
 * Validation state for all form fields.
 * 
 * @interface ValidationState
 */
interface ValidationState {
  /** Phone number validation details */
  phoneNumber: {
    /** Raw input value */
    value: string;
    /** Whether the phone number is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Detected network provider from prefix */
    detectedNetwork: NetworkProvider | null;
    /** Formatted phone number for display */
    formatted: string;
  };
  /** Amount validation details */
  amount: {
    /** Numeric amount value */
    value: number;
    /** Whether the amount is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
  };
}

/**
 * Configuration options for the validation hook.
 * 
 * @interface UsePurchaseValidationOptions
 */
interface UsePurchaseValidationOptions {
  /** Current wallet balance for insufficient funds check */
  walletBalance: number;
  /** Purchase type affects amount limits */
  purchaseType: 'airtime' | 'data';
}

/**
 * Hook return type for purchase validation.
 * 
 * @interface UsePurchaseValidationReturn
 */
interface UsePurchaseValidationReturn {
  /** Full validation state for all fields */
  validation: ValidationState;
  /** Error messages (only for touched fields) */
  errors: {
    phone?: string;
    amount?: string;
  };
  /** Whether the entire form is valid for submission */
  isFormValid: boolean;
  /** Update phone number value */
  setPhoneNumber: (value: string) => void;
  /** Update amount value */
  setAmount: (value: number) => void;
  /** Reset all validation state */
  resetValidation: () => void;
  /** Track which fields have been interacted with */
  touched: {
    phone: boolean;
    amount: boolean;
  };
}

/**
 * Custom hook for validating airtime/data purchase inputs.
 * 
 * Provides real-time validation of phone numbers and amounts,
 * with automatic network detection and user-friendly error messages.
 * Errors are only displayed after the user has interacted with a field.
 * 
 * @param {UsePurchaseValidationOptions} options - Configuration options
 * @returns {UsePurchaseValidationReturn} Validation state and methods
 * 
 * @example
 * const {
 *   validation,
 *   errors,
 *   isFormValid,
 *   setPhoneNumber,
 *   setAmount,
 *   resetValidation,
 * } = usePurchaseValidation({
 *   walletBalance: 10000,
 *   purchaseType: "data",
 * });
 */
export function usePurchaseValidation({ walletBalance, purchaseType }: UsePurchaseValidationOptions): UsePurchaseValidationReturn {
  const [phoneInput, setPhoneInput] = useState('');
  const [amountInput, setAmountInput] = useState<number>(0);
  const [touched, setTouched] = useState({ phone: false, amount: false });

  /**
   * Validates phone number input.
   * Memoized to prevent unnecessary recalculations.
   */
  const phoneValidation = useMemo(() => {
    if (!phoneInput) {
      return {
        value: '',
        isValid: false,
        error: undefined,
        detectedNetwork: null as NetworkProvider | null,
        formatted: '',
      };
    }
    
    const result = validateNigerianPhoneNumber(phoneInput);
    return {
      value: phoneInput,
      isValid: result.valid,
      error: result.error,
      detectedNetwork: result.detectedNetwork as NetworkProvider | null,
      formatted: formatPhoneNumber(result.cleanedNumber),
    };
  }, [phoneInput]);

  /**
   * Validates amount input against limits and wallet balance.
   * Memoized to prevent unnecessary recalculations.
   */
  const amountValidation = useMemo(() => {
    if (amountInput <= 0) {
      return {
        value: 0,
        isValid: false,
        error: undefined,
      };
    }
    
    const result = validatePurchaseAmount(amountInput, walletBalance, purchaseType);
    return {
      value: amountInput,
      isValid: result.valid,
      error: result.error,
    };
  }, [amountInput, walletBalance, purchaseType]);

  /** Combined validation state */
  const validation: ValidationState = useMemo(() => ({
    phoneNumber: phoneValidation,
    amount: amountValidation,
  }), [phoneValidation, amountValidation]);

  /**
   * Updates phone number and marks field as touched.
   */
  const setPhoneNumber = useCallback((value: string) => {
    setPhoneInput(value);
    setTouched(prev => ({ ...prev, phone: true }));
  }, []);

  /**
   * Updates amount and marks field as touched.
   */
  const setAmount = useCallback((value: number) => {
    setAmountInput(value);
    setTouched(prev => ({ ...prev, amount: true }));
  }, []);

  /**
   * Resets all validation state to initial values.
   * Call this after successful form submission.
   */
  const resetValidation = useCallback(() => {
    setPhoneInput('');
    setAmountInput(0);
    setTouched({ phone: false, amount: false });
  }, []);

  /** Whether the entire form is valid for submission */
  const isFormValid = useMemo(() => {
    return validation.phoneNumber.isValid && validation.amount.isValid;
  }, [validation]);

  /**
   * Error messages only shown for touched fields.
   * This prevents showing errors before user interaction.
   */
  const errors = useMemo(() => ({
    phone: touched.phone ? validation.phoneNumber.error : undefined,
    amount: touched.amount ? validation.amount.error : undefined,
  }), [touched, validation]);

  return {
    validation,
    errors,
    isFormValid,
    setPhoneNumber,
    setAmount,
    resetValidation,
    touched,
  };
}
