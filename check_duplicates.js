import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfqrytpcohmvcfjdnuth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXJ5dHBjb2htdmNmamRudXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk5NzcsImV4cCI6MjA4NzUzNTk3N30.Qwg3g66cebTVtVm9S8FZuod6rPTazsvvBRIkuDJvUrs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    try {
        console.log('--- Checking for Case-Insensitive Nickname Duplicates ---');

        const { data: users, error } = await supabase
            .from('users')
            .select('nickname');

        if (error) {
            console.error('Error:', error);
            return;
        }

        const counts = {};
        const duplicates = [];

        users.forEach(u => {
            const lower = u.nickname.toLowerCase();
            counts[lower] = (counts[lower] || 0) + 1;
            if (counts[lower] > 1 && !duplicates.includes(lower)) {
                duplicates.push(lower);
            }
        });

        if (duplicates.length > 0) {
            console.log('Found case-insensitive duplicates:');
            duplicates.forEach(d => {
                const matches = users.filter(u => u.nickname.toLowerCase() === d).map(u => u.nickname);
                console.log(`- "${d}": ${matches.join(', ')}`);
            });
        } else {
            console.log('No case-insensitive duplicates found.');
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

checkDuplicates();
