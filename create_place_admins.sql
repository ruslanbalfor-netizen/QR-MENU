-- =============================================
-- PLACE_ADMINS: Müştəri-Məkan əlaqəsi cədvəli
-- Supabase SQL Editor-da icra edin
-- =============================================

-- 1. Yeni cədvəl yaradırıq
CREATE TABLE IF NOT EXISTS public.place_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,           -- Supabase auth.users.id
    place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'place_admin',  -- 'super_admin' və ya 'place_admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, place_id)        -- Bir istifadəçi bir məkana 1 dəfə bağlana bilər
);

-- 2. RLS aktivləşdiririk
ALTER TABLE public.place_admins ENABLE ROW LEVEL SECURITY;

-- Hər kəs (authenticated) öz qeydini oxuya bilsin
DROP POLICY IF EXISTS "Users can view own admin records" ON public.place_admins;
CREATE POLICY "Users can view own admin records" ON public.place_admins
    FOR SELECT USING (auth.uid() = user_id);

-- Super adminlər bütün qeydləri görə bilsin
DROP POLICY IF EXISTS "Super admins can view all" ON public.place_admins;
CREATE POLICY "Super admins can view all" ON public.place_admins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin' AND pa.place_id IS NULL
        )
    );

-- Super adminlər insert/update/delete edə bilsin
DROP POLICY IF EXISTS "Super admins can manage all" ON public.place_admins;
CREATE POLICY "Super admins can manage all" ON public.place_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin' AND pa.place_id IS NULL
        )
    );


-- =============================================
-- PLACES: Yenilənmiş RLS siyasətləri
-- =============================================

-- Köhnə admin policy-ni silirik
DROP POLICY IF EXISTS "Admins can manage places" ON public.places;

-- Super admin → bütün məkanları idarə edə bilər
CREATE POLICY "Super admins can manage places" ON public.places
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin' AND pa.place_id IS NULL
        )
    );

-- Müştəri admin → yalnız öz məkanını UPDATE edə bilər (INSERT/DELETE yoxdur)
CREATE POLICY "Place admins can update own place" ON public.places
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'place_admin' AND pa.place_id = places.id
        )
    );

-- Müştəri admin → öz məkanını SELECT edə bilsin (admin panel üçün)
CREATE POLICY "Place admins can view own place" ON public.places
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.place_id = places.id
        )
    );


-- =============================================
-- CATEGORIES: Yenilənmiş RLS siyasətləri
-- =============================================

-- Köhnə admin policy-ni silirik
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Super admin → bütün kateqoriyaları idarə edə bilər
CREATE POLICY "Super admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin' AND pa.place_id IS NULL
        )
    );

-- Müştəri admin → yalnız öz məkanına aid kateqoriyaları idarə edə bilər
CREATE POLICY "Place admins can manage own categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'place_admin' AND pa.place_id = categories.place_id
        )
    );


-- =============================================
-- ITEMS: Yenilənmiş RLS siyasətləri
-- =============================================

-- Köhnə admin policy-ni silirik
DROP POLICY IF EXISTS "Admins can manage items" ON public.items;

-- Super admin → bütün məhsulları idarə edə bilər
CREATE POLICY "Super admins can manage items" ON public.items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin' AND pa.place_id IS NULL
        )
    );

-- Müştəri admin → yalnız öz məkanına aid kateqoriyalardakı məhsulları idarə edə bilər
CREATE POLICY "Place admins can manage own items" ON public.items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.place_admins pa
            JOIN public.categories c ON c.place_id = pa.place_id
            WHERE pa.user_id = auth.uid() AND pa.role = 'place_admin' AND c.id = items.category_id
        )
    );


-- =============================================
-- İLK SUPER ADMİN QEYD:
-- Aşağıdakı sorğunu İCRA EDİN və <YOUR_USER_ID> hissəsini
-- Supabase Dashboard → Authentication → Users → öz istifadəçinizin ID-si ilə əvəz edin
-- =============================================
-- INSERT INTO public.place_admins (user_id, role, place_id)
-- VALUES ('<YOUR_USER_ID>', 'super_admin', NULL);
