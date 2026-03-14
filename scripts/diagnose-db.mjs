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
  } catch (e) {
    return null;
  }
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// We'll use the service role key to check everything
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  // 1. Check Branches Table
  console.log('Checking branches table...');
  const { data: branches, error: bError } = await supabase.from('branches').select('*');
  if (bError) {
    console.log('Error reading branches table:', bError.message);
    if (bError.message.includes('relation "public.branches" does not exist')) {
        console.log('CRITICAL: branches table DOES NOT EXIST.');
    }
  } else {
    console.log('Branches found:', branches.length);
    branches.forEach(b => console.log(` - [${b.id}] ${b.name}`));
  }

  // 2. Check Profiles
  console.log('\nChecking admin profiles...');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, email, role');
  if (pError) {
    console.log('Error reading profiles table:', pError.message);
  } else {
    console.log('Profiles found:', profiles.length);
    profiles.forEach(p => console.log(` - [${p.id}] ${p.email} (${p.role})`));
  }

  // 3. Check Enums
  console.log('\nChecking enums...');
  const { data: enums, error: eError } = await supabase.rpc('execute_sql_fix', {
    sql_query: "SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace;"
  });
  
  // Since execute_sql_fix might not exist, I'll try a simpler way via raw query if supported or just try to insert different values.
  // Actually, I'll try to select from pg_type/pg_enum directly if RPC is not available.
  
  if (eError) {
    console.log('Error reading enums (RPC fail):', eError.message);
  } else {
    console.log('Enums found:', enums?.length);
    enums?.forEach(e => console.log(` - [${e.type}] ${e.value}`));
  }
}

diagnose();
