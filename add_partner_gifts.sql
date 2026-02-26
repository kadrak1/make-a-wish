-- 9. ТАБЛИЦА ПОДАРКОВ ПАРТНЕРА (Custom Gifts)
CREATE TABLE IF NOT EXISTS public.partner_gifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    rarity TEXT CHECK (rarity IN ('common', 'epic', 'legendary')) DEFAULT 'common',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Отключить RLS для удобства (как в остальных таблицах проекта)
ALTER TABLE public.partner_gifts DISABLE ROW LEVEL SECURITY;

-- Добавить в публикацию Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE partner_gifts;
