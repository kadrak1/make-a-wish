import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfqrytpcohmvcfjdnuth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXJ5dHBjb2htdmNmamRudXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk5NzcsImV4cCI6MjA4NzUzNTk3N30.Qwg3g66cebTVtVm9S8FZuod6rPTazsvvBRIkuDJvUrs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDuplicates() {
    try {
        console.log('--- Checking for Nickname Duplicates (Case-Insensitive) ---');

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .ilike('nickname', 'Shiary');

        if (error) {
            console.error('Error:', error);
        } else {
            console.log(`Found ${users.length} matches for "Shiary" (case-insensitive):`);
            users.forEach(u => {
                console.log(`- ID: ${u.id}, Nickname: ${u.nickname}, HasPassword: ${!!u.password}`);
            });
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

debugDuplicates();
