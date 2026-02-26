-- ============================================================
-- ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ БД для проекта Make-A-Wish
-- Выполни этот скрипт в Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ (кастомная авторизация по никнейму)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nickname TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Отключить RLS (нет Supabase Auth)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. СОСТОЯНИЕ ИГРЫ
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    primogems INTEGER DEFAULT 160,
    wishes INTEGER DEFAULT 0,
    pity_counter INTEGER DEFAULT 0,
    queue JSONB DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    completed_quests JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_state DISABLE ROW LEVEL SECURITY;

-- 3. КОНФИГИ КВЕСТОВ (задаются через AdminPanel)
CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    daily_quests_config JSONB DEFAULT NULL,
    main_quests_config JSONB DEFAULT NULL,
    world_quests_config JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_quests DISABLE ROW LEVEL SECURITY;

-- 4. СОВМЕСТНЫЕ КВЕСТЫ (для функции "Для двоих")
CREATE TABLE IF NOT EXISTS public.shared_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reward_primogems INTEGER DEFAULT 0,
    schedule_days JSONB DEFAULT '[]'::jsonb,
    status TEXT CHECK (status IN ('active', 'completed', 'verified', 'claimed')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    quest_type TEXT DEFAULT 'one-time' CHECK (quest_type IN ('one-time', 'repeatable', 'together'))
);

ALTER TABLE public.shared_quests DISABLE ROW LEVEL SECURITY;

-- 5. СВЯЗИ ПОЛЬЗОВАТЕЛЕЙ (партнёры)
CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    linked_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, linked_user_id)
);

ALTER TABLE public.user_connections DISABLE ROW LEVEL SECURITY;

-- 6. СООБЩЕНИЯ (чат)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 7. RPC-ФУНКЦИЯ: отправка запроса на дружбу
CREATE OR REPLACE FUNCTION send_friend_request(sender_id UUID, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender ID is missing');
  END IF;

  IF sender_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нельзя добавить самого себя');
  END IF;

  IF EXISTS (
      SELECT 1 FROM user_connections
      WHERE (user_id = sender_id AND linked_user_id = target_user_id)
         OR (user_id = target_user_id AND linked_user_id = sender_id)
  ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Запрос уже отправлен или вы уже связаны');
  END IF;

  INSERT INTO user_connections (user_id, linked_user_id, status)
  VALUES (sender_id, target_user_id, 'pending');

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 8. REALTIME (для чата и совместных квестов)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE user_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
