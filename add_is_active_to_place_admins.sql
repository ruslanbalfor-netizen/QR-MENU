-- place_admins cədvəlinə is_active sütunu əlavə etmək
-- Supabase SQL Editor-da icra edin

ALTER TABLE public.place_admins 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
