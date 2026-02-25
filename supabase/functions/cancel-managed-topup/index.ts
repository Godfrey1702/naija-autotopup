/**
 * CANCEL/PAUSE MANAGED TOP-UP EDGE FUNCTION
 * ==========================================
 * 
 * Handles cancellation and pause operations for scheduled top-ups.
 * Provides clean REST endpoints with proper authorization.
 * 
 * ## Endpoints
 * 
 * ### DELETE /cancel-managed-topup?id=<schedule_id>
 * Cancels a scheduled top-up permanently.
 * Returns 204 No Content on success.
 * 
 * ### PATCH /cancel-managed-topup?id=<schedule_id>&action=pause
 * Pauses an active scheduled top-up.
 * 
 * ### PATCH /cancel-managed-topup?id=<schedule_id>&action=resume
 * Resumes a paused scheduled top-up.
 * 
 * @module cancel-managed-topup
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const corsHandler = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
};

Deno.serve(corsHandler || (async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
    );
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'You must be logged in' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(req.url);
    const scheduleId = url.searchParams.get('id');
    
    if (!scheduleId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Schedule ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // =========================================================================
    // DELETE - Cancel a scheduled top-up permanently
    // =========================================================================
    if (req.method === 'DELETE') {
      console.log(`[cancel-managed-topup] DELETE request for schedule ${scheduleId}`);

      // Verify the schedule belongs to the user
      const { data: schedule, error: fetchError } = await adminClient
        .from('scheduled_topups')
        .select('id, user_id, status')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !schedule) {
        console.error('[cancel-managed-topup] Schedule not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Not Found', message: 'Schedule not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (schedule.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'You do not have permission to cancel this schedule' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Prevent cancelling already completed or cancelled schedules
      if (['completed', 'cancelled'].includes(schedule.status)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Operation', 
            message: `Cannot cancel a ${schedule.status} schedule`
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Cancel the schedule
      const { data: updated, error: updateError } = await adminClient
        .from('scheduled_topups')
        .update({ 
          status: 'cancelled',
          next_execution_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (updateError) {
        console.error('[cancel-managed-topup] Cancel error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Internal Server Error', message: 'Failed to cancel schedule' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[cancel-managed-topup] Successfully cancelled schedule ${scheduleId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Schedule cancelled successfully',
          schedule: updated
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // =========================================================================
    // PATCH - Pause or Resume a scheduled top-up
    // =========================================================================
    if (req.method === 'PATCH') {
      const action = url.searchParams.get('action');
      
      if (!action || !['pause', 'resume'].includes(action)) {
        return new Response(
          JSON.stringify({ 
            error: 'Bad Request', 
            message: "Action must be 'pause' or 'resume'"
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[cancel-managed-topup] PATCH request to ${action} schedule ${scheduleId}`);

      // Verify the schedule belongs to the user
      const { data: schedule, error: fetchError } = await adminClient
        .from('scheduled_topups')
        .select('id, user_id, status')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !schedule) {
        console.error('[cancel-managed-topup] Schedule not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Not Found', message: 'Schedule not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (schedule.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'You do not have permission to modify this schedule' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Validate state transitions
      if (action === 'pause' && schedule.status !== 'active') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Operation', 
            message: 'Can only pause active schedules'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (action === 'resume' && schedule.status !== 'paused') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Operation', 
            message: 'Can only resume paused schedules'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const newStatus = action === 'pause' ? 'paused' : 'active';

      // Update the schedule status
      const { data: updated, error: updateError } = await adminClient
        .from('scheduled_topups')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (updateError) {
        console.error(`[cancel-managed-topup] ${action} error:`, updateError);
        return new Response(
          JSON.stringify({ error: 'Internal Server Error', message: `Failed to ${action} schedule` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[cancel-managed-topup] Successfully ${action}ed schedule ${scheduleId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Schedule ${action}ed successfully`,
          schedule: updated
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed', message: 'Only DELETE and PATCH methods are supported' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[cancel-managed-topup] Unhandled error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}));
