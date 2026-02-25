/**
 * GET GREETING EDGE FUNCTION
 * ==========================
 * 
 * This edge function provides a time-based greeting message based on the
 * Africa/Lagos timezone (WAT - West Africa Time). This ensures users see
 * contextually appropriate greetings regardless of their device timezone.
 * 
 * ## Endpoint
 * 
 * ### GET /get-greeting
 * Returns a greeting based on the current time in Lagos, Nigeria.
 * 
 * **Response:**
 * ```json
 * {
 *   "greeting": "Good morning",
 *   "hour": 9
 * }
 * ```
 * 
 * ## Greeting Rules
 * The greeting is determined by the current hour in Africa/Lagos timezone:
 * - 05:00 – 11:59 → "Good morning"
 * - 12:00 – 16:59 → "Good afternoon"
 * - 17:00 – 04:59 → "Good evening"
 * 
 * ## Design Decision
 * Using server-side greeting generation ensures:
 * 1. Consistent user experience across timezones
 * 2. Single source of truth for greeting logic
 * 3. Easy modification of greeting rules without app updates
 * 
 * ## Security
 * This is a public endpoint (no authentication required) as the greeting
 * contains no sensitive user data.
 * 
 * @module get-greeting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * CORS headers for cross-origin requests.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Main request handler for the get-greeting edge function.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get current hour in Africa/Lagos timezone (WAT - West Africa Time)
    // This ensures consistent greetings for Nigerian users regardless of their device timezone
    const lagosTime = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    });
    
    const hour = parseInt(lagosTime, 10);
    
    let greeting: string;
    
    // Determine greeting based on hour of day
    // Morning: 5:00 AM to 11:59 AM
    // Afternoon: 12:00 PM to 4:59 PM
    // Evening: 5:00 PM to 4:59 AM (next day)
    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    console.log(`[get-greeting] Hour in Lagos: ${hour}, Greeting: ${greeting}`);

    return new Response(
      JSON.stringify({ greeting, hour }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-greeting] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
