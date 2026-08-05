-- Clear legacy Firebase Storage URLs from merchant media fields.
-- Safe / reversible in the sense that only URL strings are nulled (no file migration).
-- Run in Supabase SQL Editor (Dashboard → SQL) as postgres / service role.

-- Preview
SELECT 'services' AS table_name, id, outlet_id, name, image_url AS url
FROM public.services
WHERE image_url ILIKE '%firebasestorage%'
   OR image_url ILIKE '%googleapis.com/v0/b/%'
UNION ALL
SELECT 'staff', id, outlet_id, name, COALESCE(photo_url, profile_picture)
FROM public.staff
WHERE photo_url ILIKE '%firebasestorage%'
   OR photo_url ILIKE '%googleapis.com/v0/b/%'
   OR profile_picture ILIKE '%firebasestorage%'
   OR profile_picture ILIKE '%googleapis.com/v0/b/%';

-- Clear
UPDATE public.services
SET image_url = NULL
WHERE image_url ILIKE '%firebasestorage%'
   OR image_url ILIKE '%googleapis.com/v0/b/%';

UPDATE public.staff
SET
  photo_url = CASE
    WHEN photo_url ILIKE '%firebasestorage%' OR photo_url ILIKE '%googleapis.com/v0/b/%' THEN NULL
    ELSE photo_url
  END,
  profile_picture = CASE
    WHEN profile_picture ILIKE '%firebasestorage%' OR profile_picture ILIKE '%googleapis.com/v0/b/%' THEN NULL
    ELSE profile_picture
  END
WHERE photo_url ILIKE '%firebasestorage%'
   OR photo_url ILIKE '%googleapis.com/v0/b/%'
   OR profile_picture ILIKE '%firebasestorage%'
   OR profile_picture ILIKE '%googleapis.com/v0/b/%';

-- Verify
SELECT 'services_remaining' AS check_name, count(*)::int AS n
FROM public.services
WHERE image_url ILIKE '%firebasestorage%' OR image_url ILIKE '%googleapis.com/v0/b/%'
UNION ALL
SELECT 'staff_remaining', count(*)::int
FROM public.staff
WHERE photo_url ILIKE '%firebasestorage%'
   OR photo_url ILIKE '%googleapis.com/v0/b/%'
   OR profile_picture ILIKE '%firebasestorage%'
   OR profile_picture ILIKE '%googleapis.com/v0/b/%';
