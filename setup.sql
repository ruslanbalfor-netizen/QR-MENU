-- 1. "places" cədvəli yaradırıq (Restoranlar/Məkanlar üçün)
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- qısa ad, məs: ruslan-cafe
    name TEXT NOT NULL,        -- uzun ad, məs: Ruslanın Yeri
    currency TEXT DEFAULT 'AZN',
    logo TEXT,
    cover TEXT,
    phone TEXT,
    whatsapp TEXT,
    instagram TEXT,
    facebook TEXT,
    google_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. "categories" cədvəli
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY, -- slug əsaslı ID
    place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
    name_az TEXT NOT NULL,
    name_en TEXT,
    name_ru TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. "items" cədvəli
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
    name_az TEXT NOT NULL,
    name_en TEXT,
    name_ru TEXT,
    desc_az TEXT,
    desc_en TEXT,
    desc_ru TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image TEXT,
    calories INTEGER,
    prep_time TEXT,
    is_kid_friendly BOOLEAN DEFAULT FALSE,
    badges TEXT[], -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====== TƏHLÜKƏSİZLİK (RLS) ======

-- RLS-i aktivləşdiririk
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 1. PLACES Siyasətləri
DROP POLICY IF EXISTS "Public can view places" ON public.places;
CREATE POLICY "Public can view places" ON public.places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage places" ON public.places;
CREATE POLICY "Admins can manage places" ON public.places FOR ALL USING (auth.role() = 'authenticated');

-- 2. CATEGORIES Siyasətləri
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');

-- 3. ITEMS Siyasətləri
DROP POLICY IF EXISTS "Public can view items" ON public.items;
CREATE POLICY "Public can view items" ON public.items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage items" ON public.items;
CREATE POLICY "Admins can manage items" ON public.items FOR ALL USING (auth.role() = 'authenticated');

-- ====== STORAGE SECURITY ======
-- Supabase storage "objects" cədvəli üçün siyasətlər

-- 1. Hər kəs şəkilləri görə bilsin
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'qr-menu-images' );

-- 2. Yalnız adminlər şəkil yükləyə, dəyişə və silə bilsin
CREATE POLICY "Admin CRUD" ON storage.objects FOR ALL USING (
    bucket_id = 'qr-menu-images' AND auth.role() = 'authenticated'
);
