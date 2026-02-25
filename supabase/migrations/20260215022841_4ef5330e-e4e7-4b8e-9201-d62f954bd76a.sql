
-- Scheduled top-ups table
CREATE TABLE public.scheduled_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('airtime', 'data')),
  network TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  plan_id TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('one_time', 'daily', 'weekly', 'monthly')),
  scheduled_at TIMESTAMP WITH TIME ZONE, -- for one-time schedules
  recurring_time TIME, -- time of day for recurring
  recurring_day_of_week INTEGER CHECK (recurring_day_of_week BETWEEN 0 AND 6), -- 0=Sunday for weekly
  recurring_day_of_month INTEGER CHECK (recurring_day_of_month BETWEEN 1 AND 28), -- for monthly
  max_executions INTEGER, -- null means unlimited (but we require it per user choice)
  total_executions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  next_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Execution log for auditability
CREATE TABLE public.scheduled_topup_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_topup_id UUID NOT NULL REFERENCES public.scheduled_topups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  failure_reason TEXT,
  amount NUMERIC NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_topup_executions ENABLE ROW LEVEL SECURITY;

-- RLS: scheduled_topups
CREATE POLICY "Users can view their own scheduled topups"
  ON public.scheduled_topups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled topups"
  ON public.scheduled_topups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled topups"
  ON public.scheduled_topups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled topups"
  ON public.scheduled_topups FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: scheduled_topup_executions (read-only for users, service role writes)
CREATE POLICY "Users can view their own execution logs"
  ON public.scheduled_topup_executions FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_scheduled_topups_user_id ON public.scheduled_topups(user_id);
CREATE INDEX idx_scheduled_topups_next_execution ON public.scheduled_topups(next_execution_at) WHERE status = 'active';
CREATE INDEX idx_scheduled_topup_executions_topup_id ON public.scheduled_topup_executions(scheduled_topup_id);

-- Timestamp trigger
CREATE TRIGGER update_scheduled_topups_updated_at
  BEFORE UPDATE ON public.scheduled_topups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
