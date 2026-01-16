import { useState, useCallback, useMemo } from 'react';
import { 
  validateNigerianPhoneNumber, 
  validatePurchaseAmount,
  getNetworkFromPhone,
  formatPhoneNumber,
} from '@/lib/validation';
import type { NetworkProvider } from '@/lib/constants';

interface ValidationState {
  phoneNumber: {
    value: string;
    isValid: boolean;
    error?: string;
    detectedNetwork: NetworkProvider | null;
    formatted: string;
  };
  amount: {
    value: number;
    isValid: boolean;
    error?: string;
  };
}

interface UsePurchaseValidationOptions {
  walletBalance: number;
  purchaseType: 'airtime' | 'data';
}

export function usePurchaseValidation({ walletBalance, purchaseType }: UsePurchaseValidationOptions) {
  const [phoneInput, setPhoneInput] = useState('');
  const [amountInput, setAmountInput] = useState<number>(0);
  const [touched, setTouched] = useState({ phone: false, amount: false });

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

  const validation: ValidationState = useMemo(() => ({
    phoneNumber: phoneValidation,
    amount: amountValidation,
  }), [phoneValidation, amountValidation]);

  const setPhoneNumber = useCallback((value: string) => {
    setPhoneInput(value);
    setTouched(prev => ({ ...prev, phone: true }));
  }, []);

  const setAmount = useCallback((value: number) => {
    setAmountInput(value);
    setTouched(prev => ({ ...prev, amount: true }));
  }, []);

  const resetValidation = useCallback(() => {
    setPhoneInput('');
    setAmountInput(0);
    setTouched({ phone: false, amount: false });
  }, []);

  const isFormValid = useMemo(() => {
    return validation.phoneNumber.isValid && validation.amount.isValid;
  }, [validation]);

  // Only show errors after user has interacted with the field
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
