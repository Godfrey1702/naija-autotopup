
-- Add direct phone_number text column to scheduled_topups
ALTER TABLE public.scheduled_topups
ADD COLUMN phone_number text;

-- Backfill from phone_numbers table for existing rows
UPDATE public.scheduled_topups st
SET phone_number = pn.phone_number
FROM public.phone_numbers pn
WHERE st.phone_number_id = pn.id AND st.phone_number IS NULL;
