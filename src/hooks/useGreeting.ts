/**
 * @fileoverview Server-Driven Greeting Hook
 * 
 * This hook fetches a time-appropriate greeting from the backend based on
 * the Africa/Lagos timezone (WAT - West Africa Time). This ensures users
 * see contextually appropriate greetings regardless of their device timezone.
 * 
 * ## Why Server-Driven?
 * - Consistent experience across timezones
 * - Single source of truth for greeting logic
 * - Easy modification without app updates
 * - Follows the app's server-driven UI content philosophy
 * 
 * ## Greeting Rules (Africa/Lagos timezone)
 * - 05:00 – 11:59 → "Good morning"
 * - 12:00 – 16:59 → "Good afternoon"
 * - 17:00 – 04:59 → "Good evening"
 * 
 * @example
 * import { useGreeting } from "@/hooks/useGreeting";
 * 
 * function Header() {
 *   const { greeting, loading } = useGreeting();
 *   
 *   return (
 *     <h1>
 *       {loading ? "Hello" : greeting}, {userName}!
 *     </h1>
 *   );
 * }
 * 
 * @module useGreeting
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook return type for greeting data.
 * 
 * @interface UseGreetingReturn
 */
interface UseGreetingReturn {
  /** Time-appropriate greeting string */
  greeting: string;
  /** Whether the greeting is being fetched */
  loading: boolean;
}

/**
 * Custom hook for fetching server-driven greeting.
 * 
 * Calls the `get-greeting` edge function to retrieve a greeting
 * based on the current time in Africa/Lagos timezone.
 * 
 * Falls back to "Good morning" if the fetch fails.
 * 
 * @returns {UseGreetingReturn} Greeting string and loading state
 * 
 * @example
 * const { greeting, loading } = useGreeting();
 * console.log(greeting); // "Good afternoon"
 */
export function useGreeting(): UseGreetingReturn {
  const [greeting, setGreeting] = useState<string>("Good morning");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Fetches the greeting from the backend.
     * This is a public endpoint (no auth required).
     */
    async function fetchGreeting() {
      try {
        const { data, error } = await supabase.functions.invoke('get-greeting');
        
        if (error) {
          console.error('Error fetching greeting:', error);
          return;
        }
        
        if (data?.greeting) {
          setGreeting(data.greeting);
        }
      } catch (error) {
        console.error('Error fetching greeting:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGreeting();
  }, []);

  return { greeting, loading };
}
