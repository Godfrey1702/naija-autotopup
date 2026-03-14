/**
 * @fileoverview Admin API Edge Function
 * 
 * Provides admin-only data access using service_role.
 * Validates JWT and checks admin role before executing any action.
 * All admin queries are server-side to prevent data leakage.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    // Check admin role
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, ...params } = body;

    let result: unknown;

    switch (action) {
      case "check_role":
        result = { is_admin: true };
        break;

      case "dashboard_metrics": {
        const [usersRes, walletsRes, txnsRes, schedulesRes, recentRes, revenueRes] = await Promise.all([
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("wallets").select("balance"),
          supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("scheduled_topups").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabaseAdmin.from("transactions").select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabaseAdmin.from("transactions").select("amount").eq("status", "completed")
            .in("type", ["airtime_purchase", "data_purchase"]),
        ]);

        const totalBalance = (walletsRes.data || []).reduce((sum, w) => sum + Number(w.balance), 0);
        const totalRevenue = (revenueRes.data || []).reduce((sum, t) => sum + Number(t.amount), 0);

        result = {
          totalUsers: usersRes.count || 0,
          totalWalletBalance: totalBalance,
          totalTransactions: txnsRes.count || 0,
          activeSchedules: schedulesRes.count || 0,
          recentTransactions: recentRes.count || 0,
          totalRevenue,
        };
        break;
      }

      case "get_users": {
        const { page = 1, limit = 20, search } = params;
        let query = supabaseAdmin.from("profiles").select("*", { count: "exact" });
        if (search) {
          query = query.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
        }
        const { data, count } = await query
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
        result = { users: data || [], total: count || 0 };
        break;
      }

      case "get_user_details": {
        const { userId } = params;
        const [profileRes, walletRes, txnRes] = await Promise.all([
          supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
          supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
          supabaseAdmin.from("transactions").select("*").eq("user_id", userId)
            .order("created_at", { ascending: false }).limit(20),
        ]);
        result = { profile: profileRes.data, wallet: walletRes.data, transactions: txnRes.data || [] };
        break;
      }

      case "get_transactions": {
        const { page = 1, limit = 25, userId, status, dateFrom } = params;
        let query = supabaseAdmin.from("transactions").select("*", { count: "exact" });
        if (userId) query = query.eq("user_id", userId);
        if (status) query = query.eq("status", status);
        if (dateFrom) query = query.gte("created_at", dateFrom);
        const { data, count } = await query
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
        result = { transactions: data || [], total: count || 0 };
        break;
      }

      case "get_wallets": {
        const { page = 1, limit = 20, search } = params;
        // Join with profiles isn't directly available, so fetch wallets then enrich
        let query = supabaseAdmin.from("wallets").select("*", { count: "exact" });
        const { data: wallets, count } = await query
          .order("balance", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        // Enrich with user names
        const userIds = (wallets || []).map((w) => w.user_id);
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
        const enriched = (wallets || []).map((w) => ({
          ...w,
          full_name: profileMap.get(w.user_id) || null,
        }));

        // Filter by search after enrichment if needed
        let filtered = enriched;
        if (search) {
          const s = search.toLowerCase();
          filtered = enriched.filter((w) => w.full_name?.toLowerCase().includes(s));
        }

        result = { wallets: filtered, total: count || 0 };
        break;
      }

      case "get_scheduled_topups": {
        const { page = 1, limit = 20, status } = params;
        let query = supabaseAdmin.from("scheduled_topups").select("*", { count: "exact" });
        if (status) query = query.eq("status", status);
        const { data, count } = await query
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
        result = { schedules: data || [], total: count || 0 };
        break;
      }

      case "get_analytics": {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

        const [activeToday, activeWeek, spendToday, spendWeek, networkBreakdown] = await Promise.all([
          supabaseAdmin.from("transactions").select("user_id")
            .gte("created_at", todayStart),
          supabaseAdmin.from("transactions").select("user_id")
            .gte("created_at", weekAgo),
          supabaseAdmin.from("transactions").select("amount")
            .eq("status", "completed").gte("created_at", todayStart),
          supabaseAdmin.from("transactions").select("amount")
            .eq("status", "completed").gte("created_at", weekAgo),
          supabaseAdmin.from("transactions").select("network, amount")
            .eq("status", "completed").not("network", "is", null)
            .gte("created_at", weekAgo),
        ]);

        const uniqueToday = new Set((activeToday.data || []).map((t) => t.user_id)).size;
        const uniqueWeek = new Set((activeWeek.data || []).map((t) => t.user_id)).size;
        const sumToday = (spendToday.data || []).reduce((s, t) => s + Number(t.amount), 0);
        const sumWeek = (spendWeek.data || []).reduce((s, t) => s + Number(t.amount), 0);

        // Network breakdown
        const netMap = new Map<string, { count: number; amount: number }>();
        for (const t of networkBreakdown.data || []) {
          const key = t.network || "unknown";
          const existing = netMap.get(key) || { count: 0, amount: 0 };
          netMap.set(key, { count: existing.count + 1, amount: existing.amount + Number(t.amount) });
        }
        const topNetworks = Array.from(netMap.entries())
          .map(([network, stats]) => ({ network, ...stats }))
          .sort((a, b) => b.amount - a.amount);

        result = {
          activeUsersToday: uniqueToday,
          activeUsersWeek: uniqueWeek,
          totalSpendingToday: sumToday,
          totalSpendingWeek: sumWeek,
          topNetworks,
          dailyTrend: [],
        };
        break;
      }

      case "adjust_wallet": {
        const { userId: targetUserId, amount, type, reason } = params;
        if (!targetUserId || !amount || !type || !reason) {
          throw new Error("Missing required fields: userId, amount, type, reason");
        }

        const ref = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        if (type === "credit") {
          const { data: fundResult } = await supabaseAdmin.rpc("fund_wallet_atomic", {
            p_user_id: targetUserId,
            p_amount: amount,
            p_reference: ref,
          });
          if (!fundResult?.success) throw new Error(fundResult?.error || "Failed to credit wallet");
          result = { success: true, ...fundResult };
        } else {
          const { data: deductResult } = await supabaseAdmin.rpc("lock_and_deduct_wallet", {
            p_user_id: targetUserId,
            p_amount: amount,
            p_reference: ref,
          });
          if (!deductResult?.success) throw new Error(deductResult?.error || "Failed to debit wallet");
          result = { success: true, ...deductResult };
        }

        // Log admin action
        await supabaseAdmin.from("wallet_ledger").update({ description: `Admin ${type}: ${reason}` })
          .eq("transaction_reference", ref);

        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
