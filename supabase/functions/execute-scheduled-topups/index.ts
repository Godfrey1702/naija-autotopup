/**
 * EXECUTE SCHEDULED TOP-UPS EDGE FUNCTION
 * =========================================
 * 
 * Cron-triggered function that processes due scheduled top-ups.
 * Runs every minute via pg_cron.
 * 
 * For each due schedule:
 * 1. Validates the schedule is still active
 * 2. Checks wallet balance
 * 3. Calls the appropriate Payflex API
 * 4. Records the transaction (reuses same pipeline as manual top-ups)
 * 5. Updates budget/spending via secure-transaction-update
 * 6. Logs execution and sends notifications
 * 
 * @module execute-scheduled-topups
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';

const BUDGET_THRESHOLDS = [50, 75, 90, 100];

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function calculateNextExecution(
  scheduleType: string,
  scheduledAt?: string | null,
  recurringTime?: string | null,
  recurringDayOfWeek?: number | null,
  recurringDayOfMonth?: number | null,
): string | null {
  const now = new Date();

  if (scheduleType === 'one_time') return null; // One-time already executed

  if (!recurringTime) return null;
  const [hours, minutes] = recurringTime.split(':').map(Number);

  if (scheduleType === 'daily') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (scheduleType === 'weekly') {
    const targetDay = recurringDayOfWeek ?? 0;
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(now.getDate() + ((targetDay - now.getDay() + 7) % 7 || 7));
    return next.toISOString();
  }

  if (scheduleType === 'monthly') {
    const targetDay = recurringDayOfMonth ?? 1;
    const next = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes, 0, 0);
    return next.toISOString();
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(adminClient: any, userId: string, notification: {
  title: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; category: string; metadata?: Record<string, unknown>;
}) {
  try {
    await adminClient.from('notifications').insert({
      user_id: userId, ...notification, metadata: notification.metadata || {},
    });
  } catch (e) {
    console.error('[notification] Failed:', e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordSpendingAndUpdateBudget(adminClient: any, userId: string, transactionId: string, type: string, amount: number) {
  const currentMonth = getCurrentMonthYear();
  const category = type === 'airtime_purchase' ? 'AIRTIME' : 'DATA';

  try {
    await adminClient.from('spending_events').insert({
      user_id: userId, transaction_id: transactionId, category, amount,
    });

    const { data: budget } = await adminClient
      .from('user_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .maybeSingle();

    if (!budget) return;

    const newAmountSpent = Number(budget.amount_spent) + amount;
    const budgetAmount = Number(budget.budget_amount);

    await adminClient.from('user_budgets')
      .update({ amount_spent: newAmountSpent, updated_at: new Date().toISOString() })
      .eq('id', budget.id);

    if (budgetAmount <= 0) return;

    const percentageUsed = Math.round((newAmountSpent / budgetAmount) * 100);
    const lastAlertLevel = budget.last_alert_level || 0;

    for (const threshold of BUDGET_THRESHOLDS) {
      if (percentageUsed >= threshold && lastAlertLevel < threshold) {
        const isOver = threshold >= 100;
        const remaining = Math.max(0, budgetAmount - newAmountSpent);

        await createNotification(adminClient, userId, {
          title: isOver ? 'Monthly Budget Exceeded' : `${threshold}% Budget Used`,
          message: isOver
            ? `You've exceeded your monthly budget of ₦${budgetAmount.toLocaleString()}.`
            : `You've used ${threshold}% of your monthly budget. ₦${remaining.toLocaleString()} remaining.`,
          type: isOver ? 'warning' : 'info',
          category: 'budget',
          metadata: { threshold, budgetAmount, amountSpent: newAmountSpent, percentageUsed, remaining },
        });

        await adminClient.from('user_budgets').update({ last_alert_level: threshold }).eq('id', budget.id);
        break;
      }
    }
  } catch (e) {
    console.error('[budget] Error:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Fetch all due schedules
    const { data: dueSchedules, error: fetchError } = await adminClient
      .from('scheduled_topups')
      .select('*, phone_numbers(phone_number)')
      .eq('status', 'active')
      .lte('next_execution_at', now)
      .order('next_execution_at', { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('[execute-scheduled-topups] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch schedules' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[execute-scheduled-topups] Processing ${dueSchedules.length} due schedules`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      processed++;
      const phoneNumber = schedule.phone_numbers?.phone_number;

      if (!phoneNumber) {
        console.error(`[execute-scheduled-topups] No phone number for schedule ${schedule.id}`);
        await logExecution(adminClient, schedule, 'failed', 'No phone number associated', null);
        await createNotification(adminClient, schedule.user_id, {
          title: 'Scheduled Top-Up Failed',
          message: `Your scheduled ${schedule.type} top-up of ₦${Number(schedule.amount).toLocaleString()} failed: No phone number found.`,
          type: 'error', category: 'transaction',
        });
        failed++;
        continue;
      }

      // Check wallet balance
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', schedule.user_id)
        .single();

      if (!wallet) {
        await logExecution(adminClient, schedule, 'failed', 'Wallet not found', null);
        failed++;
        continue;
      }

      const amount = Number(schedule.amount);
      const currentBalance = Number(wallet.balance);

      if (currentBalance < amount) {
        await logExecution(adminClient, schedule, 'failed', 'Insufficient wallet balance', null);
        await createNotification(adminClient, schedule.user_id, {
          title: 'Scheduled Top-Up Failed',
          message: `Your scheduled ${schedule.type} top-up of ₦${amount.toLocaleString()} failed due to insufficient wallet balance (₦${currentBalance.toLocaleString()}).`,
          type: 'error', category: 'transaction',
          metadata: { scheduleId: schedule.id, amount, balance: currentBalance },
        });
        failed++;
        // Still advance the schedule for recurring
        await advanceSchedule(adminClient, schedule);
        continue;
      }

      // Call Payflex API
      const endpoint = schedule.type === 'airtime' ? 'airtime/purchase' : 'data/purchase';
      const purchaseBody = schedule.type === 'airtime'
        ? { phone_number: phoneNumber, amount, network: schedule.network.toLowerCase() }
        : { phone_number: phoneNumber, plan_id: schedule.plan_id, network: schedule.network.toLowerCase() };

      let purchaseSuccess = false;
      let purchaseData: Record<string, unknown> = {};

      try {
        const purchaseRes = await fetch(`${PAYFLEX_BASE_URL}/${endpoint}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${PAYFLEX_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseBody),
        });

        if (purchaseRes.ok) {
          purchaseData = await purchaseRes.json();
          purchaseSuccess = true;
        } else {
          const errData = await purchaseRes.json().catch(() => ({}));
          purchaseData = errData;
          console.error(`[execute-scheduled-topups] Payflex error for schedule ${schedule.id}:`, errData);
        }
      } catch (e) {
        console.error(`[execute-scheduled-topups] Payflex call failed for schedule ${schedule.id}:`, e);
        purchaseData = { error: e instanceof Error ? e.message : 'Unknown error' };
      }

      if (!purchaseSuccess) {
        // Create failed transaction record
        const txRef = `SCHED-${schedule.type.toUpperCase()}-${Date.now()}`;
        const { data: txData } = await adminClient.from('transactions').insert({
          wallet_id: wallet.id,
          user_id: schedule.user_id,
          type: schedule.type === 'airtime' ? 'airtime_purchase' : 'data_purchase',
          amount,
          balance_before: currentBalance,
          balance_after: currentBalance, // No deduction on failure
          status: 'failed',
          reference: txRef,
          description: `Scheduled ${schedule.type} for ${phoneNumber} (failed)`,
          metadata: { scheduled_topup_id: schedule.id, phone_number: phoneNumber, ...purchaseData },
        }).select().single();

        await logExecution(adminClient, schedule, 'failed', 'Payflex API failure', txData?.id || null);
        await createNotification(adminClient, schedule.user_id, {
          title: 'Scheduled Top-Up Failed',
          message: `Your scheduled ${schedule.type} top-up of ₦${amount.toLocaleString()} for ${phoneNumber} failed. No funds were deducted.`,
          type: 'error', category: 'transaction',
          metadata: { scheduleId: schedule.id },
        });
        failed++;
        await advanceSchedule(adminClient, schedule);
        continue;
      }

      // Purchase succeeded - create transaction and deduct balance
      const balanceAfter = currentBalance - amount;
      const txRef = `SCHED-${schedule.type.toUpperCase()}-${Date.now()}`;
      const txType = schedule.type === 'airtime' ? 'airtime_purchase' : 'data_purchase';

      const { data: txData, error: txError } = await adminClient.from('transactions').insert({
        wallet_id: wallet.id,
        user_id: schedule.user_id,
        type: txType,
        amount,
        balance_before: currentBalance,
        balance_after: balanceAfter,
        status: 'completed',
        reference: txRef,
        description: `Scheduled ${schedule.type} for ${phoneNumber}`,
        metadata: {
          scheduled_topup_id: schedule.id,
          phone_number: phoneNumber,
          network: schedule.network,
          plan_id: schedule.plan_id,
          external_reference: purchaseData.reference,
          external_transaction_id: purchaseData.transaction_id,
        },
      }).select().single();

      if (txError) {
        console.error(`[execute-scheduled-topups] Transaction insert error:`, txError);
        failed++;
        await advanceSchedule(adminClient, schedule);
        continue;
      }

      // Deduct wallet balance
      await adminClient.from('wallets')
        .update({ balance: balanceAfter })
        .eq('id', wallet.id)
        .eq('user_id', schedule.user_id);

      // Record spending and update budget (same pipeline as manual)
      await recordSpendingAndUpdateBudget(adminClient, schedule.user_id, txData.id, txType, amount);

      // Log success
      await logExecution(adminClient, schedule, 'success', null, txData.id);

      // Send success notification
      await createNotification(adminClient, schedule.user_id, {
        title: 'Scheduled Top-Up Successful',
        message: `Your scheduled ${schedule.type} top-up of ₦${amount.toLocaleString()} for ${phoneNumber} was successful.`,
        type: 'success', category: 'transaction',
        metadata: { scheduleId: schedule.id, transactionId: txData.id, amount },
      });

      succeeded++;
      await advanceSchedule(adminClient, schedule);
    }

    console.log(`[execute-scheduled-topups] Done: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);

    return new Response(JSON.stringify({ success: true, processed, succeeded, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[execute-scheduled-topups] Fatal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logExecution(adminClient: any, schedule: any, status: string, failureReason: string | null, transactionId: string | null) {
  try {
    await adminClient.from('scheduled_topup_executions').insert({
      scheduled_topup_id: schedule.id,
      user_id: schedule.user_id,
      transaction_id: transactionId,
      status,
      failure_reason: failureReason,
      amount: schedule.amount,
    });
  } catch (e) {
    console.error('[execute-scheduled-topups] Log execution error:', e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceSchedule(adminClient: any, schedule: any) {
  const newTotalExecutions = (schedule.total_executions || 0) + 1;
  const maxReached = schedule.max_executions && newTotalExecutions >= schedule.max_executions;

  if (schedule.schedule_type === 'one_time' || maxReached) {
    // Mark as completed
    await adminClient.from('scheduled_topups')
      .update({ status: 'completed', next_execution_at: null, total_executions: newTotalExecutions })
      .eq('id', schedule.id);
    return;
  }

  // Calculate next execution for recurring
  const nextExec = calculateNextExecution(
    schedule.schedule_type,
    schedule.scheduled_at,
    schedule.recurring_time,
    schedule.recurring_day_of_week,
    schedule.recurring_day_of_month,
  );

  await adminClient.from('scheduled_topups')
    .update({ next_execution_at: nextExec, total_executions: newTotalExecutions })
    .eq('id', schedule.id);
}
