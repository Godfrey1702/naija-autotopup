/**
 * BUDGET MANAGEMENT EDGE FUNCTION
 * ================================
 * 
 * This edge function manages user monthly spending budgets. It is the single source
 * of truth for all budget-related logic, ensuring the frontend cannot manipulate
 * budget calculations.
 * 
 * ## Endpoints
 * 
 * ### GET /budget-management/current
 * Fetches the current month's budget data for the authenticated user.
 * 
 * **Response:**
 * ```json
 * {
 *   "budget_amount": 10000,
 *   "amount_spent": 6850,
 *   "remaining": 3150,
 *   "percentage_used": 69,
 *   "last_alert_level": 50,
 *   "month_year": "2026-01"
 * }
 * ```
 * 
 * ### POST /budget-management
 * Sets or updates the monthly budget amount for the authenticated user.
 * 
 * **Request Body:**
 * ```json
 * { "budget_amount": 10000 }
 * ```
 * 
 * **Response:** Same as GET /current
 * 
 * ## Security
 * - Requires valid JWT token in Authorization header
 * - Uses service role for database operations to bypass RLS
 * - User can only access their own budget data
 * 
 * ## Data Model
 * Budgets are tracked per month using `month_year` format (e.g., "2026-01").
 * When a new month begins, a new budget record is created automatically
 * when the user sets their budget.
 * 
 * @module budget-management
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS headers for cross-origin requests.
 * Allows requests from any origin to support the web app.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Request payload for setting a monthly budget.
 */
interface SetBudgetRequest {
  /** The budget limit amount in NGN (Nigerian Naira) */
  budget_amount: number;
}

/**
 * Response structure for budget operations.
 * Contains calculated fields derived from stored data.
 */
interface BudgetResponse {
  /** The set monthly budget limit in NGN */
  budget_amount: number;
  /** Total amount spent this month in NGN */
  amount_spent: number;
  /** Remaining budget (budget_amount - amount_spent), minimum 0 */
  remaining: number;
  /** Percentage of budget used (0-100+), can exceed 100 if over budget */
  percentage_used: number;
  /** Last notification threshold reached (0, 50, 75, 90, or 100) */
  last_alert_level: number;
  /** Month identifier in YYYY-MM format */
  month_year: string;
}

/**
 * Generates the current month-year string in YYYY-MM format.
 * Used as a key to track budgets on a monthly basis.
 * 
 * @returns {string} Current month in YYYY-MM format (e.g., "2026-01")
 * 
 * @example
 * const monthYear = getCurrentMonthYear();
 * // Returns: "2026-01" (for January 2026)
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Main request handler for the budget-management edge function.
 * Routes requests to appropriate handlers based on HTTP method and path.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests for browser compatibility
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Retrieve Supabase configuration from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authorization header exists
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client with JWT for authentication verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT token and extract user information
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role for database operations
    // This bypasses RLS policies for secure server-side operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const currentMonth = getCurrentMonthYear();

    // Parse the request URL to determine the endpoint
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // =========================================================================
    // GET /budget-management/current - Fetch current month's budget
    // =========================================================================
    if (req.method === "GET" && path === "current") {
      console.log(`[budget-management] Fetching budget for user ${user.id}, month ${currentMonth}`);

      // Query the user's budget for the current month
      const { data: budget, error: fetchError } = await adminClient
        .from("user_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (fetchError) {
        console.error("[budget-management] Error fetching budget:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch budget" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no budget exists for this month, return default values
      // This indicates the user hasn't set a budget yet
      if (!budget) {
        const response: BudgetResponse = {
          budget_amount: 0,
          amount_spent: 0,
          remaining: 0,
          percentage_used: 0,
          last_alert_level: 0,
          month_year: currentMonth,
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate derived fields from stored data
      const remaining = Math.max(0, budget.budget_amount - budget.amount_spent);
      const percentage_used = budget.budget_amount > 0 
        ? Math.round((budget.amount_spent / budget.budget_amount) * 100) 
        : 0;

      const response: BudgetResponse = {
        budget_amount: Number(budget.budget_amount),
        amount_spent: Number(budget.amount_spent),
        remaining,
        percentage_used,
        last_alert_level: budget.last_alert_level,
        month_year: budget.month_year,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // POST /budget-management - Set/Update monthly budget
    // =========================================================================
    if (req.method === "POST") {
      const body: SetBudgetRequest = await req.json();
      
      // Validate budget amount is a positive number
      if (typeof body.budget_amount !== "number" || body.budget_amount < 0) {
        return new Response(
          JSON.stringify({ error: "Invalid budget amount. Must be a positive number." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[budget-management] Setting budget for user ${user.id}, month ${currentMonth}, amount ${body.budget_amount}`);

      // Check if a budget record already exists for the current month
      const { data: existingBudget } = await adminClient
        .from("user_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth)
        .maybeSingle();

      let budget;
      if (existingBudget) {
        // Update existing budget - preserve the spent amount
        // Only the budget limit is updated, not the spending
        const { data, error } = await adminClient
          .from("user_budgets")
          .update({ 
            budget_amount: body.budget_amount,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingBudget.id)
          .select()
          .single();

        if (error) {
          console.error("[budget-management] Error updating budget:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update budget" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        budget = data;
      } else {
        // Create new budget record for this month
        // Starts with 0 spent and no alerts triggered
        const { data, error } = await adminClient
          .from("user_budgets")
          .insert({
            user_id: user.id,
            month_year: currentMonth,
            budget_amount: body.budget_amount,
            amount_spent: 0,
            last_alert_level: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("[budget-management] Error creating budget:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create budget" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        budget = data;
      }

      // Calculate derived fields for the response
      const remaining = Math.max(0, budget.budget_amount - budget.amount_spent);
      const percentage_used = budget.budget_amount > 0 
        ? Math.round((budget.amount_spent / budget.budget_amount) * 100) 
        : 0;

      const response: BudgetResponse = {
        budget_amount: Number(budget.budget_amount),
        amount_spent: Number(budget.amount_spent),
        remaining,
        percentage_used,
        last_alert_level: budget.last_alert_level,
        month_year: budget.month_year,
      };

      console.log(`[budget-management] Budget set successfully:`, response);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return 405 for unsupported HTTP methods
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[budget-management] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
