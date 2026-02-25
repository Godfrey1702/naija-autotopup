/**
 * @fileoverview Phone Number Context Provider
 * 
 * This module manages the user's phone numbers, including their primary
 * phone number from the profile and additional saved phone numbers.
 * Users can save up to 3 additional phone numbers beyond their primary.
 * 
 * ## Features
 * - Primary phone number from user profile
 * - Up to 3 additional saved phone numbers
 * - CRUD operations for additional numbers
 * - Network provider tracking
 * - Verification status tracking
 * 
 * @example
 * // Using the phone numbers hook in a component
 * import { usePhoneNumbers } from "@/contexts/PhoneNumberContext";
 * 
 * function PhoneSelector() {
 *   const { allPhoneNumbers, canAddMore, addPhoneNumber } = usePhoneNumbers();
 *   
 *   return (
 *     <Select>
 *       {allPhoneNumbers.map(phone => (
 *         <SelectItem key={phone.id ?? 'primary'}>
 *           {phone.phone_number} ({phone.network_provider})
 *         </SelectItem>
 *       ))}
 *     </Select>
 *   );
 * }
 * 
 * @module PhoneNumberContext
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Phone number record from the database.
 * Stored in the `phone_numbers` table.
 * 
 * @interface PhoneNumber
 */
export interface PhoneNumber {
  /** Unique record ID */
  id: string;
  /** Reference to the owning user */
  user_id: string;
  /** Phone number in Nigerian format (11 digits) */
  phone_number: string;
  /** Detected network provider (MTN, Airtel, Glo, 9mobile) */
  network_provider: string | null;
  /** User-defined label (e.g., "Work", "Family") */
  label: string | null;
  /** Whether the number has been verified */
  is_verified: boolean;
  /** Record creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Unified phone number display structure.
 * Combines primary and additional phone numbers into a single format.
 * 
 * @interface DisplayPhoneNumber
 */
export interface DisplayPhoneNumber {
  /** Record ID (null for primary phone from profile) */
  id: string | null;
  /** Phone number in Nigerian format */
  phone_number: string;
  /** Network provider */
  network_provider: string | null;
  /** Display label */
  label: string | null;
  /** Whether this is the primary phone from profile */
  is_primary: boolean;
  /** Verification status */
  is_verified: boolean;
}

/**
 * Phone number context type definition.
 * 
 * @interface PhoneNumberContextType
 */
interface PhoneNumberContextType {
  /** Additional phone numbers from phone_numbers table */
  phoneNumbers: PhoneNumber[];
  /** All phone numbers including primary (for UI display) */
  allPhoneNumbers: DisplayPhoneNumber[];
  /** Loading state */
  loading: boolean;
  /** Add a new phone number */
  addPhoneNumber: (phone: string, network: string | null, label?: string) => Promise<{ error: Error | null }>;
  /** Update an existing phone number */
  updatePhoneNumber: (id: string, updates: Partial<PhoneNumber>) => Promise<{ error: Error | null }>;
  /** Delete a phone number */
  deletePhoneNumber: (id: string) => Promise<{ error: Error | null }>;
  /** Refresh phone numbers from database */
  refreshPhoneNumbers: () => Promise<void>;
  /** Whether user can add more phone numbers */
  canAddMore: boolean;
}

/** React context for phone number state */
const PhoneNumberContext = createContext<PhoneNumberContextType | undefined>(undefined);

/**
 * Custom hook to access phone number context.
 * Must be used within a PhoneNumberProvider.
 * 
 * @throws {Error} If used outside of PhoneNumberProvider
 * @returns {PhoneNumberContextType} Phone number state and methods
 */
export const usePhoneNumbers = () => {
  const context = useContext(PhoneNumberContext);
  if (!context) {
    throw new Error("usePhoneNumbers must be used within a PhoneNumberProvider");
  }
  return context;
};

/** Maximum number of additional phone numbers allowed per user */
const MAX_ADDITIONAL_PHONES = 3;

/**
 * Phone Number Provider Component.
 * Manages phone number state and provides CRUD operations.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 */
export const PhoneNumberProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches additional phone numbers from the database.
   * Automatically called when user changes.
   */
  const fetchPhoneNumbers = async () => {
    if (!user) {
      setPhoneNumbers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching phone numbers:", error);
    } else {
      setPhoneNumbers(data || []);
    }
    setLoading(false);
  };

  // Fetch phone numbers when user changes
  useEffect(() => {
    fetchPhoneNumbers();
  }, [user]);

  // Build combined list with primary phone first
  const allPhoneNumbers: DisplayPhoneNumber[] = [];
  
  // Add primary phone from profile (if exists)
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

  // Add additional phones from phone_numbers table
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

  /** Whether user can add more phone numbers */
  const canAddMore = phoneNumbers.length < MAX_ADDITIONAL_PHONES;

  /**
   * Adds a new phone number to the user's saved numbers.
   * 
   * @param {string} phone - Phone number in Nigerian format
   * @param {string | null} network - Network provider
   * @param {string} [label] - Optional label for the number
   * @returns {Promise<{ error: Error | null }>} Result with error if failed
   */
  const addPhoneNumber = async (
    phone: string,
    network: string | null,
    label?: string
  ): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };
    if (!canAddMore) return { error: new Error("Maximum phone numbers reached") };

    const { error } = await supabase.from("phone_numbers").insert({
      user_id: user.id,
      phone_number: phone,
      network_provider: network,
      label: label || null,
      is_verified: true, // For demo; in production, verify via OTP
    });

    if (!error) {
      await fetchPhoneNumbers();
    }

    return { error: error as Error | null };
  };

  /**
   * Updates an existing phone number.
   * 
   * @param {string} id - Phone number record ID
   * @param {Partial<PhoneNumber>} updates - Fields to update
   * @returns {Promise<{ error: Error | null }>} Result with error if failed
   */
  const updatePhoneNumber = async (
    id: string,
    updates: Partial<PhoneNumber>
  ): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };

    const { error } = await supabase
      .from("phone_numbers")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      await fetchPhoneNumbers();
    }

    return { error: error as Error | null };
  };

  /**
   * Deletes a phone number from the user's saved numbers.
   * 
   * @param {string} id - Phone number record ID
   * @returns {Promise<{ error: Error | null }>} Result with error if failed
   */
  const deletePhoneNumber = async (id: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("No user logged in") };

    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      await fetchPhoneNumbers();
    }

    return { error: error as Error | null };
  };

  /**
   * Refreshes phone numbers from the database.
   * Call this after external updates to phone numbers.
   */
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
