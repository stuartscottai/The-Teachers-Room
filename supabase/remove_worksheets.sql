-- Retire the worksheet database feature.
--
-- Run this in the Supabase SQL Editor only AFTER deploying the website code
-- that no longer uses saved_worksheets.
--
-- This permanently deletes the saved worksheet records. Export the table first
-- if you want to keep an archive.

begin;

drop table if exists public.saved_worksheets cascade;

commit;

-- Do not delete the "worksheet-assets" Storage bucket. Despite its old name,
-- the live quiz-game image and school-logo features still use it.
--
-- Old files inside the "worksheets/" folder should be deleted through the
-- Supabase Storage dashboard or Storage API. Deleting rows directly from
-- storage.objects can leave the underlying files behind.
