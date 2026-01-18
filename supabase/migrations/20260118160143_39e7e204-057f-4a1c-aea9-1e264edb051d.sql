-- Add SELECT policy to allow users to view their own KYC records
CREATE POLICY "Users can view their own KYC data"
ON public.user_kyc
FOR SELECT
USING (auth.uid() = user_id);