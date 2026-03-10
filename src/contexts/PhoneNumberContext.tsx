/**
 * @fileoverview Phone Number Context Provider
 * 
 * Manages the user's phone numbers via the src/api service layer.
 * 
 * @module PhoneNumberContext
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/api";

export interface PhoneNumber {
  id: string;
  user_id: string;
  phone_number: string;
  network_provider: string | null;
  label: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisplayPhoneNumber {
  id: string | null;
  phone_number: string;
  network_provider: string | null;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
}

interface PhoneNumberContextType {
  phoneNumbers: PhoneNumber[];
  allPhoneNumbers: DisplayPhoneNumber[];
  loading: boolean;
  addPhoneNumber: (phone: string, network: string | null, label?: string) => Promise<{ error: Error | null }>;
  updatePhoneNumber: (id: string, updates: Partial<PhoneNumber>) => Promise<{ error: Error | null }>;
  deletePhoneNumber: (id: string) => Promise<{ error: Error | null }>;
  refreshPhoneNumbers: () => Promise<void>;
  canAddMore: boolean;
}

const PhoneNumberContext = createContext<PhoneNumberContextType | undefined>(undefined);

export const usePhoneNumbers = () => {
  const context = useContext(PhoneNumberContext);
  if (!context) {
    throw new Error("usePhoneNumbers must be used within a PhoneNumberProvider");
  }
  return context;
};

const MAX_ADDITIONAL_PHONES = 3;

export const PhoneNumberProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhoneNumbers = async () => {
    if (!user) {
      setPhoneNumbers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await userService.getPhoneNumbers(user.id);
    if (error) {
      console.error("Error fetching phone numbers:", error);
    } else {
      setPhoneNumbers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, [user]);

  const allPhoneNumbers: DisplayPhoneNumber[] = [];

  if (profile?.phone_number) {
    allPhoneNumbers.push({
      id: null,
      phone_number: profile.phone_number,
      network_provider: profile.network_provider,
      label: "Primary (Account Number)",
      is_primary: true,
      is_verified: profile.phone_verified || false,
    });
  }

  phoneNumbers.forEach((phone) => {
    allPhoneNumbers.push({
      id: phone.id,
      phone_number: phone.phone_number,
      network_provider: phone.network_provider,
      label: phone.label,
      is_primary: false,
      is_verified: phone.is_verified,
    });
  });

  const canAddMore = phoneNumbers.length < MAX_ADDITIONAL_PHONES;

  const addPhoneNumber = async (
    phone: string,
    network: string | null,
    label?: string
  ): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };
    if (!canAddMore) return { error: new Error("Maximum phone numbers reached") };

    const { error } = await userService.addPhoneNumber({
      user_id: user.id,
      phone_number: phone,
      network_provider: network,
      label: label || null,
      is_verified: true,
    });

    if (!error) {
      await fetchPhoneNumbers();
    }
    return { error: error as Error | null };
  };

  const updatePhoneNumber = async (
    id: string,
    updates: Partial<PhoneNumber>
  ): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };
    const { error } = await userService.updatePhoneNumber(id, user.id, updates as Record<string, unknown>);
    if (!error) {
      await fetchPhoneNumbers();
    }
    return { error: error as Error | null };
  };

  const deletePhoneNumber = async (id: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };
    const { error } = await userService.deletePhoneNumber(id, user.id);
    if (!error) {
      await fetchPhoneNumbers();
    }
    return { error: error as Error | null };
  };

  const refreshPhoneNumbers = async () => {
    await fetchPhoneNumbers();
  };

  return (
    <PhoneNumberContext.Provider
      value={{
        phoneNumbers,
        allPhoneNumbers,
        loading,
        addPhoneNumber,
        updatePhoneNumber,
        deletePhoneNumber,
        refreshPhoneNumbers,
        canAddMore,
      }}
    >
      {children}
    </PhoneNumberContext.Provider>
  );
};
