import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkxpqnadkovugfzesxpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1reHBxbmFka292dWdmemVzeHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjA5MjUsImV4cCI6MjA3OTMzNjkyNX0.iB-Vj4pHHM84mmv5wIGA7a5RfMPr6w0QKihQwAlkCeY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        console.log('Checking game_state...');
        const { data: gameState, error: error1 } = await supabase
            .from('game_state')
            .select('*')
            .limit(1);

        if (error1) console.error('Game State Error:', error1);
        else console.log('Game State Columns:', gameState && gameState.length > 0 ? Object.keys(gameState[0]) : 'No data');

        console.log('Checking user_quests...');
        const { data: userQuests, error: error2 } = await supabase
            .from('user_quests')
            .select('*')
            .limit(1);

        if (error2) console.error('User Quests Error:', error2);
        else console.log('User Quests Columns:', userQuests && userQuests.length > 0 ? Object.keys(userQuests[0]) : 'No data');

    } catch (e) {
        console.error('Exception:', e);
    }
}

checkSchema();
