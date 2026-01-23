import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetBudgetRequest {
  budget_amount: number;
}

interface BudgetResponse {
  budget_amount: number;
  amount_spent: number;
  remaining: number;
  percentage_used: number;
  last_alert_level: number;
  month_year: string;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create user client for authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const currentMonth = getCurrentMonthYear();

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /budget-management/current - Fetch current month's budget
    if (req.method === "GET" && path === "current") {
      console.log(`Fetching budget for user ${user.id}, month ${currentMonth}`);

      const { data: budget, error: fetchError } = await adminClient
        .from("user_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching budget:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch budget" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no budget exists for this month, return defaults
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

    // POST /budget-management - Set/Update monthly budget
    if (req.method === "POST") {
      const body: SetBudgetRequest = await req.json();
      
      // Validate budget amount
      if (typeof body.budget_amount !== "number" || body.budget_amount < 0) {
        return new Response(
          JSON.stringify({ error: "Invalid budget amount. Must be a positive number." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Setting budget for user ${user.id}, month ${currentMonth}, amount ${body.budget_amount}`);

      // Check if budget exists for current month
      const { data: existingBudget } = await adminClient
        .from("user_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth)
        .maybeSingle();

      let budget;
      if (existingBudget) {
        // Update existing budget (only the amount, preserve spent)
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
          console.error("Error updating budget:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update budget" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        budget = data;
      } else {
        // Create new budget for this month
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
          console.error("Error creating budget:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create budget" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        budget = data;
      }

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

      console.log(`Budget set successfully:`, response);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Budget management error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
