import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("!!! CONFIGURATION ERROR: Missing SUPABASE environment variables !!!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log("--- MOCK DATA SEEDING INITIATED ---");
  const email = 'tech@ethan.in'
  
  try {
    console.log(`[1/2] Attempting Auth Registration for: ${email}`);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'Password123!',
      options: {
        data: {
          full_name: 'Mock Tech',
          role: 'technician'
        }
      }
    })

    if (error) {
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          console.log('>>> STATUS: User identity already exists. Skipping registration.');
      } else {
          throw new Error(`Sign up stage failed: ${error.message}`);
      }
    } else {
      console.log(`>>> SUCCESS: User created with ID: ${data.user?.id}`);
    }

    console.log("[2/2] FINALIZING...");
    console.log("--- SEEDING COMPLETED SUCCESSFULLY ---");

  } catch (err) {
    console.error("!!! CRITICAL SEEDING FAILURE !!!");
    console.error(`ERROR DETAIL: ${err.message}`);
    process.exit(1);
  }
}

main()
