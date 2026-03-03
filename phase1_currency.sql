-- ============================================================
-- PHASE 1: Новая валютная архитектура
-- Запускать в Supabase Dashboard -> SQL Editor
-- БЕЗОПАСНО: все операции идемпотентны
-- ============================================================

-- ============================================================
-- 1. game_state: переименовать primogems → universal_primogems
--    добавить xp INTEGER DEFAULT 0
-- ============================================================
DO $$
BEGIN
  -- Переименовать primogems → universal_primogems (безопасно если существует)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_state' AND column_name = 'primogems'
  ) THEN
    ALTER TABLE public.game_state RENAME COLUMN primogems TO universal_primogems;
    RAISE NOTICE 'game_state.primogems → universal_primogems: OK';
  ELSE
    RAISE NOTICE 'game_state.universal_primogems: уже существует, пропускаем';
  END IF;

  -- Добавить xp если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_state' AND column_name = 'xp'
  ) THEN
    ALTER TABLE public.game_state ADD COLUMN xp INTEGER DEFAULT 0;
    RAISE NOTICE 'game_state.xp: добавлен';
  ELSE
    RAISE NOTICE 'game_state.xp: уже существует, пропускаем';
  END IF;
END $$;

-- ============================================================
-- 2. user_connections: переименовать балансы + добавить connection_color
--    Старые имена: user_balance / linked_user_balance
--    Новые имена:  user_primogems / linked_user_primogems
-- ============================================================
DO $$
BEGIN
  -- user_balance → user_primogems
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'user_balance'
  ) THEN
    ALTER TABLE public.user_connections RENAME COLUMN user_balance TO user_primogems;
    RAISE NOTICE 'user_connections.user_balance → user_primogems: OK';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'user_primogems'
    ) THEN
      ALTER TABLE public.user_connections ADD COLUMN user_primogems INTEGER DEFAULT 0;
      RAISE NOTICE 'user_connections.user_primogems: создан';
    ELSE
      RAISE NOTICE 'user_connections.user_primogems: уже существует, пропускаем';
    END IF;
  END IF;

  -- linked_user_balance → linked_user_primogems
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'linked_user_balance'
  ) THEN
    ALTER TABLE public.user_connections RENAME COLUMN linked_user_balance TO linked_user_primogems;
    RAISE NOTICE 'user_connections.linked_user_balance → linked_user_primogems: OK';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'linked_user_primogems'
    ) THEN
      ALTER TABLE public.user_connections ADD COLUMN linked_user_primogems INTEGER DEFAULT 0;
      RAISE NOTICE 'user_connections.linked_user_primogems: создан';
    ELSE
      RAISE NOTICE 'user_connections.linked_user_primogems: уже существует, пропускаем';
    END IF;
  END IF;

  -- connection_color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'connection_color'
  ) THEN
    ALTER TABLE public.user_connections ADD COLUMN connection_color TEXT DEFAULT '#22d3ee';
    RAISE NOTICE 'user_connections.connection_color: добавлен';
  ELSE
    RAISE NOTICE 'user_connections.connection_color: уже существует, пропускаем';
  END IF;

  -- wishes_balance (если нет)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'wishes_balance'
  ) THEN
    ALTER TABLE public.user_connections ADD COLUMN wishes_balance INTEGER DEFAULT 0;
    RAISE NOTICE 'user_connections.wishes_balance: добавлен';
  ELSE
    RAISE NOTICE 'user_connections.wishes_balance: уже существует, пропускаем';
  END IF;

  -- history (для гачи по соединению)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'history'
  ) THEN
    ALTER TABLE public.user_connections ADD COLUMN history JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'user_connections.history: добавлен';
  END IF;

  -- queue (для гачи по соединению)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'queue'
  ) THEN
    ALTER TABLE public.user_connections ADD COLUMN queue JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'user_connections.queue: добавлен';
  END IF;

  -- pity_counter (для гачи по соединению)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_connections' AND column_name = 'pity_counter'
  ) THEN
    ALTER TABLE public.user_connections ADD COLUMN pity_counter INTEGER DEFAULT 0;
    RAISE NOTICE 'user_connections.pity_counter: добавлен';
  END IF;
END $$;

-- ============================================================
-- 3. users: добавить password_hash (если не существует)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    RAISE NOTICE 'users.password_hash: добавлен';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_seen TIMESTAMPTZ;
    RAISE NOTICE 'users.last_seen: добавлен';
  END IF;
END $$;

-- ============================================================
-- 4. Обновить RPC send_friend_request: лимит 2 соединения
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_friend_request(sender_id UUID, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted_count INTEGER;
BEGIN
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender ID is missing');
  END IF;

  IF sender_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нельзя добавить самого себя');
  END IF;

  -- Проверить лимит 2 принятых соединения для отправителя
  SELECT COUNT(*) INTO accepted_count
  FROM user_connections
  WHERE (user_id = sender_id OR linked_user_id = sender_id)
    AND status = 'accepted';

  IF accepted_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Достигнут лимит 2 соединений');
  END IF;

  -- Проверить существование запроса
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

-- ============================================================
-- 5. Убедиться что Realtime включён для всех нужных таблиц
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_quests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_connections;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- ГОТОВО! Резюме изменений:
-- • game_state.primogems       → universal_primogems (данные сохранены)
-- • game_state.xp              → добавлен (DEFAULT 0)
-- • user_connections.user_balance → user_primogems
-- • user_connections.linked_user_balance → linked_user_primogems
-- • user_connections.connection_color → добавлен (DEFAULT '#22d3ee')
-- • send_friend_request: лимит 2 accepted соединения
-- ============================================================
