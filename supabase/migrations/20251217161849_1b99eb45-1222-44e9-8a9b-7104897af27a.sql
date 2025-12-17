-- Add KYC fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nin_number TEXT,
ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for NIN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nin_number ON public.profiles(nin_number);

-- Add constraint for wallet balance limit (8 million NGN)
ALTER TABLE public.wallets 
ADD CONSTRAINT wallet_balance_max CHECK (balance <= 8000000);

-- Update profiles RLS to allow users to update their own KYC info
-- (existing policy already allows this)