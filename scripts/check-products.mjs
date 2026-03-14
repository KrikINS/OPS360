import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkProducts() {
  const { data, error } = await supabase.from('products').select('model_name, product_code')
  if (error) {
    console.error(error)
    return
  }
  console.log('Products:', JSON.stringify(data, null, 2))
}

checkProducts()
