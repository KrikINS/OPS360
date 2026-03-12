import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  const email = 'tech@ethan.in'
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
        console.log('User already exists, continuing...');
    } else {
        console.error('Sign up error:', error);
    }
  } else {
    console.log('User signed up:', email, 'ID:', data.user?.id)
  }
}

main()
