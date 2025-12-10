-- Re-apply RLS Policies safely (Drop and Recreate)

-- 1. User Connections
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON user_connections;

CREATE POLICY "Users can view their own connections" 
ON user_connections FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = linked_user_id);

CREATE POLICY "Users can insert connections" 
ON user_connections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON user_connections FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = linked_user_id);

-- 2. Shared Quests
ALTER TABLE shared_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quests involved in" ON shared_quests;
DROP POLICY IF EXISTS "Users can create quests for linked users" ON shared_quests;
DROP POLICY IF EXISTS "Users can update quests involved in" ON shared_quests;

CREATE POLICY "Users can view quests involved in" 
ON shared_quests FOR SELECT 
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can create quests for linked users" 
ON shared_quests FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update quests involved in" 
ON shared_quests FOR UPDATE 
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- 3. Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update (read) messages received" ON messages;

CREATE POLICY "Users can view their messages" 
ON messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update (read) messages received" 
ON messages FOR UPDATE 
USING (auth.uid() = receiver_id);

-- 4. RPC Functions (Bypassing complex RLS for actions)
CREATE OR REPLACE FUNCTION send_friend_request(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Exceute with privileges of the creator (admin) to bypass RLS on Insert
AS $$
DECLARE
  current_uid UUID;
BEGIN
  current_uid := auth.uid();
  
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_uid = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нельзя добавить самого себя');
  END IF;

  -- Check if connection already exists
  IF EXISTS (
      SELECT 1 FROM user_connections 
      WHERE (user_id = current_uid AND linked_user_id = target_user_id)
         OR (user_id = target_user_id AND linked_user_id = current_uid)
  ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Запрос уже отправлен или вы уже связаны');
  END IF;

  INSERT INTO user_connections (user_id, linked_user_id, status)
  VALUES (current_uid, target_user_id, 'pending');

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
