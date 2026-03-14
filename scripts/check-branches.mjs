import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkBranches() {
  const { data, error } = await supabase.from('branches').select('*').limit(1)
  if (error) {
    console.error(error)
    return
  }
  console.log('Branches Columns:', Object.keys(data[0]))
  console.log('Sample Branch:', JSON.stringify(data[0], null, 2))
}

checkBranches()
