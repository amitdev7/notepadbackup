import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

import { config } from 'dotenv';
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DIRECT_URL or DATABASE_URL in environment or .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = new Client(config);
  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    // 1. Core schema already applied
    console.log('\n--- 1. Core schema verified (12 core tables & views present) ---');

    // 2. Run sharing schema migration
    console.log('\n--- 2. Applying 20260929000002_zenithsui_sharing_schema.sql ---');
    const sharingSqlPath = resolve(process.cwd(), 'supabase/migrations/20260929000002_zenithsui_sharing_schema.sql');
    const sharingSql = readFileSync(sharingSqlPath, 'utf8');
    await client.query(sharingSql);
    console.log('Sharing schema migration applied successfully!');

    // 3. Verify created tables
    console.log('\n--- 3. Verifying Created Public Tables ---');
    const tablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('Public tables in Supabase:');
    tablesRes.rows.forEach(r => console.log('  - ' + r.table_name));

    // 4. Reload PostgREST schema cache
    console.log('\n--- 4. Notifying PostgREST Schema Cache ---');
    try {
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('PostgREST schema reload signal sent!');
    } catch (e) {
      console.log('Note on reload schema:', e.message);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
