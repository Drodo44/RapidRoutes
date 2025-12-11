-- Fix Canadian Lanes: Relax zip constraints and remove restrictive foreign keys

-- 1. Drop existing length constraints (handle multiple naming conventions)
ALTER TABLE public.lanes DROP CONSTRAINT IF EXISTS chk_origin_zip5_len;
ALTER TABLE public.lanes DROP CONSTRAINT IF EXISTS chk_dest_zip5_len;
ALTER TABLE public.lanes DROP CONSTRAINT IF EXISTS chk_origin_zip5_length;
ALTER TABLE public.lanes DROP CONSTRAINT IF EXISTS chk_dest_zip5_length;

-- 2. Add flexible length constraints (3-10 chars)
ALTER TABLE public.lanes ADD CONSTRAINT chk_origin_zip5_len CHECK (char_length(origin_zip5) >= 3 AND char_length(origin_zip5) <= 10);
ALTER TABLE public.lanes ADD CONSTRAINT chk_dest_zip5_len CHECK (char_length(dest_zip5) >= 3 AND char_length(dest_zip5) <= 10);

-- 3. Drop foreign key constraints on zip codes
-- These are too restrictive for international/non-standard zips
ALTER TABLE lanes DROP CONSTRAINT IF EXISTS "fk_dest_zip";
ALTER TABLE lanes DROP CONSTRAINT IF EXISTS "fk_origin_zip";
ALTER TABLE lanes DROP CONSTRAINT IF EXISTS "lanes_dest_zip_fkey";
ALTER TABLE lanes DROP CONSTRAINT IF EXISTS "lanes_origin_zip_fkey";
