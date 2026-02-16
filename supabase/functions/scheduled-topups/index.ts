/**
 * SCHEDULED TOP-UPS CRUD EDGE FUNCTION
 * =====================================
 * 
 * Manages scheduled top-up creation, listing, updating, and cancellation.
 * 
 * ## Endpoints
 * 
 * ### GET /scheduled-topups - List all schedules for the user
 * ### POST /scheduled-topups - Create a new schedule
 * ### PUT /scheduled-topups?id=<uuid> - Update a schedule
 * ### DELETE /scheduled-topups?id=<uuid> - Cancel a schedule
 * 
 * @module scheduled-topups
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculates the next execution time based on schedule type.
 */
function calculateNextExecution(
  scheduleType: string,
  scheduledAt?: string,
  recurringTime?: string,
  recurringDayOfWeek?: number,
  recurringDayOfMonth?: number,
): string | null {
  const now = new Date();

  if (scheduleType === 'one_time') {
    if (!scheduledAt) return null;
    const dt = new Date(scheduledAt);
    return dt > now ? dt.toISOString() : null;
  }

  if (!recurringTime) return null;
  const [hours, minutes] = recurringTime.split(':').map(Number);

  if (scheduleType === 'daily') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (scheduleType === 'weekly') {
    const targetDay = recurringDayOfWeek ?? 0;
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    const daysUntil = (targetDay - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (daysUntil === 0 && next <= now ? 7 : daysUntil));
    return next.toISOString();
  }

  if (scheduleType === 'monthly') {
    const targetDay = recurringDayOfMonth ?? 1;
    const next = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);

    // =========================================================================
    // GET - List scheduled top-ups
    // =========================================================================
    if (req.method === 'GET') {
      const { data, error } = await adminClient
        .from('scheduled_topups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[scheduled-topups] List error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch schedules' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, schedules: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // POST - Create scheduled top-up
    // =========================================================================
    if (req.method === 'POST') {
      const body = await req.json();
      const { type, network, amount, plan_id, schedule_type, scheduled_at, recurring_time, recurring_day_of_week, recurring_day_of_month, max_executions, phone_number } = body;

      // Validate required fields
      if (!type || !network || !amount || !schedule_type || !phone_number) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type, network, amount, schedule_type, phone_number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate phone number format (Nigerian: 11 digits starting with 0)
      const cleanedPhone = String(phone_number).replace(/\D/g, '');
      if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith('0')) {
        console.error(`[scheduled-topups] Invalid phone number: ${phone_number}`);
        return new Response(JSON.stringify({ error: 'Invalid phone number. Must be a valid 11-digit Nigerian number.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['airtime', 'data'].includes(type)) {
        return new Response(JSON.stringify({ error: 'Type must be airtime or data' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['one_time', 'daily', 'weekly', 'monthly'].includes(schedule_type)) {
        return new Response(JSON.stringify({ error: 'Invalid schedule_type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (schedule_type === 'one_time' && !scheduled_at) {
        return new Response(JSON.stringify({ error: 'scheduled_at is required for one_time schedules' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (['daily', 'weekly', 'monthly'].includes(schedule_type) && !recurring_time) {
        return new Response(JSON.stringify({ error: 'recurring_time is required for recurring schedules' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const nextExecution = calculateNextExecution(schedule_type, scheduled_at, recurring_time, recurring_day_of_week, recurring_day_of_month);

      if (!nextExecution) {
        return new Response(JSON.stringify({ error: 'Could not calculate next execution time. Ensure the scheduled time is in the future.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await adminClient
        .from('scheduled_topups')
        .insert({
          user_id: user.id,
          phone_number: cleanedPhone,
          type,
          network,
          amount,
          plan_id: plan_id || null,
          schedule_type,
          scheduled_at: schedule_type === 'one_time' ? scheduled_at : null,
          recurring_time: ['daily', 'weekly', 'monthly'].includes(schedule_type) ? recurring_time : null,
          recurring_day_of_week: schedule_type === 'weekly' ? recurring_day_of_week : null,
          recurring_day_of_month: schedule_type === 'monthly' ? recurring_day_of_month : null,
          max_executions: max_executions || null,
          next_execution_at: nextExecution,
          status: 'active',
        })
        .select('*')
        .single();

      if (error) {
        console.error('[scheduled-topups] Create error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create schedule' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[scheduled-topups] Created schedule ${data.id} for user ${user.id}`);

      return new Response(JSON.stringify({ success: true, schedule: data }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // PUT - Update scheduled top-up
    // =========================================================================
    if (req.method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing schedule id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership
      const { data: existing } = await adminClient
        .from('scheduled_topups')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Schedule not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (['completed', 'cancelled'].includes(existing.status)) {
        return new Response(JSON.stringify({ error: 'Cannot update a completed or cancelled schedule' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {};

      // Allow updating specific fields
      if (body.amount !== undefined) updates.amount = body.amount;
      if (body.network !== undefined) updates.network = body.network;
      if (body.type !== undefined) updates.type = body.type;
      if (body.plan_id !== undefined) updates.plan_id = body.plan_id;
      if (body.phone_number !== undefined) updates.phone_number = body.phone_number;
      if (body.max_executions !== undefined) updates.max_executions = body.max_executions;
      if (body.status !== undefined && ['active', 'paused', 'cancelled'].includes(body.status)) {
        updates.status = body.status;
      }

      // Recalculate next execution if schedule params changed
      if (body.scheduled_at || body.recurring_time || body.recurring_day_of_week !== undefined || body.recurring_day_of_month !== undefined) {
        const schedType = body.schedule_type || existing.schedule_type;
        const nextExec = calculateNextExecution(
          schedType,
          body.scheduled_at || existing.scheduled_at,
          body.recurring_time || existing.recurring_time,
          body.recurring_day_of_week ?? existing.recurring_day_of_week,
          body.recurring_day_of_month ?? existing.recurring_day_of_month,
        );
        if (nextExec) updates.next_execution_at = nextExec;
        if (body.scheduled_at) updates.scheduled_at = body.scheduled_at;
        if (body.recurring_time) updates.recurring_time = body.recurring_time;
        if (body.recurring_day_of_week !== undefined) updates.recurring_day_of_week = body.recurring_day_of_week;
        if (body.recurring_day_of_month !== undefined) updates.recurring_day_of_month = body.recurring_day_of_month;
      }

      const { data, error } = await adminClient
        .from('scheduled_topups')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error('[scheduled-topups] Update error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update schedule' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, schedule: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // DELETE - Cancel a schedule
    // =========================================================================
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing schedule id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await adminClient
        .from('scheduled_topups')
        .update({ status: 'cancelled', next_execution_at: null })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[scheduled-topups] Cancel error:', error);
        return new Response(JSON.stringify({ error: 'Failed to cancel schedule' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[scheduled-topups] Cancelled schedule ${id}`);

      return new Response(JSON.stringify({ success: true, schedule: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[scheduled-topups] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
