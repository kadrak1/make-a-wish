-- FIX FOREIGN KEYS (Point to public.users instad of auth.users)

-- 1. User Connections
ALTER TABLE user_connections
  DROP CONSTRAINT IF EXISTS user_connections_user_id_fkey,
  DROP CONSTRAINT IF EXISTS user_connections_linked_user_id_fkey;

ALTER TABLE user_connections
  ADD CONSTRAINT user_connections_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_connections_linked_user_id_fkey 
  FOREIGN KEY (linked_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Shared Quests
ALTER TABLE shared_quests
  DROP CONSTRAINT IF EXISTS shared_quests_created_by_fkey,
  DROP CONSTRAINT IF EXISTS shared_quests_assigned_to_fkey;

ALTER TABLE shared_quests
  ADD CONSTRAINT shared_quests_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT shared_quests_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Messages
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;
