import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('Applying partner_gifts table migration...');

        // We will try to run the SQL commands individually if exec_sql RPC is not available,
        // but typically in this project we assume exec_sql or we just use the client to check.
        // Given the environment, I'll try to use a simple approach: if I can't run raw SQL,
        // I'll at least verify if the table exists or tell the user to run it.

        // However, I see 'init_database.sql' in the root, which suggests the user runs SQL manually
        // in the Supabase Dahshboard. I will try to use the 'query' approach if possible, 
        // but Supabase JS doesn't support raw SQL unless an RPC is set up.

        console.log('Please run the following SQL in your Supabase SQL Editor:');
        const sql = fs.readFileSync('add_partner_gifts.sql', 'utf8');
        console.log('-------------------------------------------');
        console.log(sql);
        console.log('-------------------------------------------');

        // Attempting to run via RPC just in case it exists from previous setups
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.log('Note: RPC "exec_sql" failed (expected if not set up). Please apply manually.');
        } else {
            console.log('Migration applied successfully via RPC!');
        }
    } catch (err) {
        console.error('Migration script error:', err);
    }
}

runMigration();
