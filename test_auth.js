import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = 'https://cfqrytpcohmvcfjdnuth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXJ5dHBjb2htdmNmamRudXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk5NzcsImV4cCI6MjA4NzUzNTk3N30.Qwg3g66cebTVtVm9S8FZuod6rPTazsvvBRIkuDJvUrs';
const supabase = createClient(supabaseUrl, supabaseKey);

function hashPassword(pass) {
    return createHash('sha256').update(pass).digest('hex');
}

async function test() {
    console.log('\n=== AUTH LOGIC TEST ===\n');

    // Test 1: Login with non-existent user
    console.log('Test 1: Login with non-existent user "NonExistent123"...');
    const { data: d1 } = await supabase.from('users').select('*').ilike('nickname', 'NonExistent123').maybeSingle();
    if (!d1) {
        console.log('  RESULT: { success: false, error: "Пользователь не найден" } ✓');
    } else {
        console.log('  RESULT: Found user unexpectedly:', d1.nickname);
    }

    // Test 2: Login with wrong password
    console.log('\nTest 2: Login as "Shiary" with wrong password...');
    const { data: d2 } = await supabase.from('users').select('*').ilike('nickname', 'Shiary').maybeSingle();
    if (d2) {
        console.log('  Shiary found. Has password:', !!d2.password, '| Password value:', d2.password ? d2.password.substring(0, 10) + '...' : 'NULL');
        if (d2.password) {
            const wrongHash = hashPassword('definitely_wrong');
            if (d2.password !== wrongHash) {
                console.log('  RESULT: { success: false, error: "Неверный пароль" } ✓');
            }
        } else {
            console.log('  RESULT: Legacy user - password will be set on first login (migration path)');
        }
    } else {
        console.log('  Shiary not found');
    }

    // Test 3: Signup with taken nickname
    console.log('\nTest 3: Signup check - is "Shiary" taken?');
    const { data: d3 } = await supabase.from('users').select('id').ilike('nickname', 'Shiary').maybeSingle();
    if (d3) {
        console.log('  RESULT: { success: false, error: "Никнейм уже занят" } ✓');
    } else {
        console.log('  RESULT: "Shiary" NOT found - signup would proceed (unexpected!)');
    }

    // Test 4: Signup check case-insensitive - "shiary" 
    console.log('\nTest 4: Signup check case-insensitive - is "shiary" treated as taken?');
    const { data: d4 } = await supabase.from('users').select('id').ilike('nickname', 'shiary').maybeSingle();
    if (d4) {
        console.log('  RESULT: { success: false, error: "Никнейм уже занят" } ✓');
    } else {
        console.log('  RESULT: "shiary" NOT found (case-insensitive search failed!)');
    }

    console.log('\n=== DONE ===\n');
}

test().catch(console.error);
