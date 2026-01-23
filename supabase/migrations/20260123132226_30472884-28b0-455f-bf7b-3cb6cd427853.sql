-- Create user_budgets table for monthly budget tracking
CREATE TABLE public.user_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- e.g. "2026-01"
  budget_amount NUMERIC NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  amount_spent NUMERIC NOT NULL DEFAULT 0 CHECK (amount_spent >= 0),
  last_alert_level INTEGER NOT NULL DEFAULT 0, -- 0 | 50 | 75 | 90 | 100
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Create spending_events table (immutable append-only log)
CREATE TABLE public.spending_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('DATA', 'AIRTIME')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_budgets (users can only view their own)
CREATE POLICY "Users can view their own budgets"
ON public.user_budgets
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete from frontend - only via edge functions
-- Service role will handle all mutations

-- RLS policies for spending_events (users can only view their own)
CREATE POLICY "Users can view their own spending events"
ON public.spending_events
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete from frontend - immutable via edge functions only

-- Create trigger to update updated_at on user_budgets
CREATE TRIGGER update_user_budgets_updated_at
BEFORE UPDATE ON public.user_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_budgets_user_month ON public.user_budgets(user_id, month_year);
CREATE INDEX idx_spending_events_user_id ON public.spending_events(user_id);
CREATE INDEX idx_spending_events_created_at ON public.spending_events(created_at);