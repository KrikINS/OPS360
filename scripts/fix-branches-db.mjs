import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

function getEnv(key) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBranches() {
  console.log('Starting branches table fix...');
  console.log('URL:', supabaseUrl);

  // We'll try to insert defaults. If table doesn't exist, this will fail but we'll see the error.
  console.log('Seeding default branches...');
  const defaults = ['Main Store', 'Branch Store 1', 'Branch Store 3'];
  for (const name of defaults) {
    const { error } = await supabase.from('branches').upsert({ name }, { onConflict: 'name' });
    if (error) {
       if (error.code === 'PGRST116' || error.message.includes('relation "public.branches" does not exist')) {
         console.log('Table missing. Attempting to create table via RPC if possible...');
         // Usually, we can't create tables via standard Supabase client unless a specific RPC is set up.
         // Given I can't run DDL easily without the MCP tools, I'll inform the user if this fails.
       }
       console.error(`Error seeding ${name}:`, error.message);
    } else {
       console.log(`Successfully seeded/verified: ${name}`);
    }
  }

  console.log('Branches fix completed.');
}

fixBranches();
