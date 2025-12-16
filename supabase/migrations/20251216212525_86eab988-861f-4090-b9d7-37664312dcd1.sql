-- Create table for additional phone numbers
CREATE TABLE public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  network_provider TEXT,
  label TEXT, -- e.g., "Work", "Family"
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own phone numbers"
ON public.phone_numbers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone numbers"
ON public.phone_numbers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers"
ON public.phone_numbers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers"
ON public.phone_numbers FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_phone_numbers_updated_at
BEFORE UPDATE ON public.phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add phone_number_id column to auto_topup_rules (nullable - null means primary phone)
ALTER TABLE public.auto_topup_rules 
ADD COLUMN phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE;

-- Remove the unique constraint on user_id+type to allow multiple rules per phone
ALTER TABLE public.auto_topup_rules DROP CONSTRAINT auto_topup_rules_user_id_type_key;

-- Add new unique constraint: one rule per type per phone number combination
ALTER TABLE public.auto_topup_rules ADD CONSTRAINT auto_topup_rules_user_phone_type_key 
UNIQUE(user_id, phone_number_id, type);