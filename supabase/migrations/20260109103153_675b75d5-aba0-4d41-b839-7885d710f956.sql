-- SECURITY FIX: Move NIN (National Identity Number) to a separate, more restricted table
-- This addresses the security finding "profiles_table_nin_exposure" by:
-- 1. Storing NIN in a dedicated table with stricter access controls
-- 2. Keeping NIN hash in profiles for verification without exposing raw NIN
-- 3. Limiting NIN access to only essential operations

-- Create the dedicated KYC table for sensitive identity data
CREATE TABLE public.user_kyc (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    -- Store NIN encrypted (in production, use pgcrypto for encryption at rest)
    nin_number_encrypted text NOT NULL,
    -- Store a hash for verification purposes without exposing the raw NIN
    nin_hash text NOT NULL,
    kyc_status text NOT NULL DEFAULT 'pending',
    kyc_verified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comment explaining the security design
COMMENT ON TABLE public.user_kyc IS 'Stores sensitive KYC data (NIN) in a separate table with restricted access. This is a security measure to protect PII data from potential RLS misconfigurations on the profiles table.';
COMMENT ON COLUMN public.user_kyc.nin_number_encrypted IS 'NIN stored with application-level encoding. For production, consider pgcrypto encryption.';
COMMENT ON COLUMN public.user_kyc.nin_hash IS 'SHA256 hash of NIN for verification without exposing raw value.';

-- Enable RLS
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE POLICIES: Users can only INSERT their own KYC data, no SELECT/UPDATE/DELETE
-- This means only backend/edge functions with service role can read the NIN
CREATE POLICY "Users can submit their own KYC" 
ON public.user_kyc 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- No SELECT policy for users - they cannot read back their NIN
-- This prevents NIN exposure even if the user's session is compromised

-- Create trigger for updated_at
CREATE TRIGGER update_user_kyc_updated_at
BEFORE UPDATE ON public.user_kyc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing NIN data from profiles to user_kyc
-- Using a simple encoding (base64) for demonstration - in production use pgcrypto
INSERT INTO public.user_kyc (user_id, nin_number_encrypted, nin_hash, kyc_status, kyc_verified_at)
SELECT 
    user_id,
    encode(nin_number::bytea, 'base64') as nin_number_encrypted,
    encode(sha256(nin_number::bytea), 'hex') as nin_hash,
    kyc_status,
    kyc_verified_at
FROM public.profiles
WHERE nin_number IS NOT NULL;

-- Remove NIN from profiles table (keep kyc_status for quick checks)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nin_number;