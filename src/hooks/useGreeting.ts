import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGreeting() {
  const [greeting, setGreeting] = useState<string>("Good morning");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
