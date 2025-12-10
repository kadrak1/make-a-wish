-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    linked_user_id UUID REFERENCES auth.users NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, linked_user_id)
);

-- RLS for user_connections
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections" 
ON user_connections FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = linked_user_id);

CREATE POLICY "Users can insert connections" 
ON user_connections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON user_connections FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = linked_user_id);

-- Create shared_quests table
CREATE TABLE IF NOT EXISTS shared_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES auth.users NOT NULL,
    assigned_to UUID REFERENCES auth.users NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reward_primogems INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'completed', 'verified', 'claimed')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS for shared_quests
ALTER TABLE shared_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quests involved in" 
ON shared_quests FOR SELECT 
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can create quests for linked users" 
ON shared_quests FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update quests involved in" 
ON shared_quests FOR UPDATE 
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users NOT NULL,
    receiver_id UUID REFERENCES auth.users NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" 
ON messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update (read) messages received" 
ON messages FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Add Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE user_connections;
