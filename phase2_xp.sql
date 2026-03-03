-- ═══════════════════════════════════════════════════════════════
-- Phase 2: XP System & Progress Path
-- Run this after phase1_currency.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Add XP columns to game_state (xp was already added in phase1 if run, idempotent)
ALTER TABLE game_state
    ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS xp_level INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS xp_milestones_claimed JSONB DEFAULT '[]';

-- 2. XP milestones table
CREATE TABLE IF NOT EXISTS xp_milestones (
    id            SERIAL PRIMARY KEY,
    xp_required   INTEGER NOT NULL,
    reward_type   TEXT    NOT NULL CHECK (reward_type IN ('primogems', 'wish', 'decoration')),
    reward_amount INTEGER NOT NULL DEFAULT 0,
    icon          TEXT    DEFAULT '⭐',
    title         TEXT    DEFAULT 'Чекпоинт',
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed default milestones (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM xp_milestones LIMIT 1) THEN
        INSERT INTO xp_milestones (xp_required, reward_type, reward_amount, icon, title) VALUES
            (100,  'primogems', 20,  '🌟', 'Первые шаги'),
            (300,  'primogems', 40,  '🌸', 'На пути'),
            (600,  'primogems', 60,  '💫', 'Полпути'),
            (1000, 'primogems', 80,  '🏆', 'Марафонец'),
            (1500, 'wish',      1,   '✨', 'Звёздная мечта'),
            (2500, 'primogems', 160, '🌙', 'Лунный страж'),
            (4000, 'wish',      2,   '🌠', 'Легенда');
    END IF;
END $$;

-- 3. RPC: claim XP milestone reward
CREATE OR REPLACE FUNCTION claim_xp_milestone(p_user_id UUID, p_milestone_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_milestone     xp_milestones%ROWTYPE;
    v_game_state    game_state%ROWTYPE;
    v_claimed_ids   JSONB;
    v_new_primos    INTEGER;
    v_new_wishes    INTEGER;
BEGIN
    -- Load milestone
    SELECT * INTO v_milestone FROM xp_milestones WHERE id = p_milestone_id;
    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Milestone not found"}'::JSONB;
    END IF;

    -- Load user game state
    SELECT * INTO v_game_state FROM game_state WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Game state not found"}'::JSONB;
    END IF;

    -- Check XP reached
    IF v_game_state.xp < v_milestone.xp_required THEN
        RETURN '{"success": false, "error": "Not enough XP"}'::JSONB;
    END IF;

    -- Check not already claimed
    v_claimed_ids := COALESCE(v_game_state.xp_milestones_claimed, '[]'::JSONB);
    IF v_claimed_ids @> to_jsonb(p_milestone_id) THEN
        RETURN '{"success": false, "error": "Already claimed"}'::JSONB;
    END IF;

    -- Apply reward
    v_new_primos := COALESCE(v_game_state.universal_primogems, 0);
    v_new_wishes  := COALESCE(v_game_state.wishes, 0);

    IF v_milestone.reward_type = 'primogems' THEN
        v_new_primos := v_new_primos + v_milestone.reward_amount;
    ELSIF v_milestone.reward_type = 'wish' THEN
        v_new_wishes := v_new_wishes + v_milestone.reward_amount;
    END IF;

    -- Update game state
    UPDATE game_state
    SET
        universal_primogems     = v_new_primos,
        wishes                  = v_new_wishes,
        xp_milestones_claimed   = v_claimed_ids || to_jsonb(p_milestone_id)
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success',          true,
        'reward_type',      v_milestone.reward_type,
        'reward_amount',    v_milestone.reward_amount,
        'new_primogems',    v_new_primos,
        'new_wishes',       v_new_wishes
    );
END;
$$;
