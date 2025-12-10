-- DISABLE RLS because the app uses custom nickname-based auth, not Supabase Auth.
-- This means auth.uid() is not available.

-- 1. User Connections
ALTER TABLE user_connections DISABLE ROW LEVEL SECURITY;

-- 2. Shared Quests
ALTER TABLE shared_quests DISABLE ROW LEVEL SECURITY;

-- 3. Messages
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 4. RPC Functions (Updated to accept sender_id explicitly)
DROP FUNCTION IF EXISTS send_friend_request(UUID);

CREATE OR REPLACE FUNCTION send_friend_request(sender_id UUID, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender ID is missing');
  END IF;

  IF sender_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нельзя добавить самого себя');
  END IF;

  -- Check if connection already exists
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
