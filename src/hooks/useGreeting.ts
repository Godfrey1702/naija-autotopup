/**
 * @fileoverview Server-Driven Greeting Hook
 * 
 * Fetches time-appropriate greeting via the api service layer.
 * 
 * @module useGreeting
 */

import { useState, useEffect } from "react";
import { greetingService } from "@/api";

interface UseGreetingReturn {
  greeting: string;
  loading: boolean;
}

export function useGreeting(): UseGreetingReturn {
  const [greeting, setGreeting] = useState<string>("Good morning");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGreeting() {
      try {
        const result = await greetingService.getGreeting();
        if (result) {
          setGreeting(result);
        }
      } catch (error) {
        console.error("Error fetching greeting:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGreeting();
  }, []);

  return { greeting, loading };
}
