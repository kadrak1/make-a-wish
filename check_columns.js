import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfqrytpcohmvcfjdnuth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXJ5dHBjb2htdmNmamRudXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk5NzcsImV4cCI6MjA4NzUzNTk3N30.Qwg3g66cebTVtVm9S8FZuod6rPTazsvvBRIkuDJvUrs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumnExistence() {
    try {
        console.log('--- Checking for "password" column existence ---');

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error:', error);
        } else if (data && data.length > 0) {
            const hasPasswordColumn = Object.keys(data[0]).includes('password');
            console.log('Columns found:', Object.keys(data[0]));
            console.log('Has "password" column:', hasPasswordColumn);
        } else {
            console.log('No users found to check columns.');
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

checkColumnExistence();
