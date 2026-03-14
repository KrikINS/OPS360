import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function renameBranch() {
  const { data, error } = await supabase
    .from('branches')
    .update({ name: 'Test Main Branch' })
    .eq('name', 'Test Main Store')
    .select()
    
  if (error) {
    console.error(error)
    return
  }
  console.log('Renamed Branch:', JSON.stringify(data, null, 2))
}

renameBranch()
