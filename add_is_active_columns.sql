-- 1. Kateqoriyalar cədvəlinə "is_active" sütunu əlavə edirik:
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Məhsullar cədvəlinə "is_active" sütunu əlavə edirik:
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
