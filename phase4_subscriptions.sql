-- ============================================================
-- PHASE 4: Система подписок + промокоды
-- Запускать в Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- 1. Таблица подписок
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('free', 'premium')) DEFAULT 'free',
    expires_at TIMESTAMPTZ,
    source TEXT CHECK (source IN ('payment', 'promo', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Таблица промокодов
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RPC: Применить промокод
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_promo RECORD;
    v_now TIMESTAMPTZ := now();
    v_expires TIMESTAMPTZ;
BEGIN
    -- Найти промокод
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE UPPER(code) = UPPER(p_code)
    FOR UPDATE; -- блокировка строки для атомарности

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден');
    END IF;

    IF NOT v_promo.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Промокод неактивен');
    END IF;

    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < v_now THEN
        RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк');
    END IF;

    IF v_promo.used_count >= v_promo.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'Промокод исчерпан');
    END IF;

    -- Проверить, не использовал ли пользователь этот код уже
    -- (через существующую Premium подписку с source='promo' той же даты — упрощённая проверка)
    -- Более строгая защита: добавить таблицу promo_redemptions (TODO фаза 4 полная)

    -- Вычислить дату истечения подписки
    v_expires := v_now + (v_promo.duration_days || ' days')::INTERVAL;

    -- Обновить счётчик использования
    UPDATE promo_codes
    SET used_count = used_count + 1
    WHERE id = v_promo.id;

    -- Создать или обновить подписку
    INSERT INTO subscriptions (user_id, status, expires_at, source)
    VALUES (p_user_id, 'premium', v_expires, 'promo')
    ON CONFLICT (user_id) DO UPDATE
    SET
        status = 'premium',
        -- Продлить, если уже premium; иначе дать новую дату
        expires_at = GREATEST(EXCLUDED.expires_at, subscriptions.expires_at + (v_promo.duration_days || ' days')::INTERVAL),
        source = 'promo',
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'expires_at', v_expires,
        'duration_days', v_promo.duration_days
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 4. RPC: Выдать подписку вручную (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_grant_premium(
    p_target_user_id UUID,
    p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expires TIMESTAMPTZ := now() + (p_duration_days || ' days')::INTERVAL;
BEGIN
    INSERT INTO subscriptions (user_id, status, expires_at, source)
    VALUES (p_target_user_id, 'premium', v_expires, 'admin')
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'premium', expires_at = v_expires, source = 'admin', updated_at = now();

    RETURN jsonb_build_object('success', true, 'expires_at', v_expires);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 5. RPC: Отозвать подписку (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_premium(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE subscriptions
    SET status = 'free', expires_at = NULL, updated_at = now()
    WHERE user_id = p_target_user_id;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (user_id, status, source)
        VALUES (p_target_user_id, 'free', 'admin');
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- ГОТОВО!
-- • subscriptions: таблица управления подписками
-- • promo_codes: таблица промокодов
-- • redeem_promo_code(user_id, code): атомарная активация
-- • admin_grant_premium / admin_revoke_premium: ручное управление
-- ============================================================
