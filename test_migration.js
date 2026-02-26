import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfqrytpcohmvcfjdnuth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXJ5dHBjb2htdmNmamRudXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk5NzcsImV4cCI6MjA4NzUzNTk3N30.Qwg3g66cebTVtVm9S8FZuod6rPTazsvvBRIkuDJvUrs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateMigration() {
    try {
        console.log('--- Simulating Legacy Migration for Shiary ---');

        const testPassword = 'debug_password_123';
        const { data: userData } = await supabase.from('users').select('*').eq('nickname', 'Shiary').single();

        if (userData && !userData.password) {
            console.log('User found without password. Attempting update...');
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: testPassword }) // Hashing doesn't matter for DB permission test
                .eq('id', userData.id);

            if (updateError) {
                console.error('Update FAILED:', updateError);
            } else {
                console.log('Update SUCCESSFUL!');

                // Rollback (clear password) for user testing
                await supabase.from('users').update({ password: null }).eq('id', userData.id);
                console.log('Rollback successful. Shiary is legacy again.');
            }
        } else {
            console.log('User already has a password or not found.', userData);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

simulateMigration();
