import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { createAdminClient } from '../utils/supabase/admin';
import { generateProductCode } from '../lib/product-coding';

async function migrateProductCodes() {
  const supabase = createAdminClient();
  
  console.log('Fetching products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, category')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products. Generating codes...`);

  // We'll use a simple global counter for sequence, but we could make it more sophisticated (e.g., per brand/category).
  // The requirement says "auto-incrementing 3-digit number", usually implying global or per-group.
  // Given the small scale, we'll use a map to track sequences per (Brand + Category) combination for a cleaner look.
  
  const sequenceMap: Record<string, number> = {};

  for (const product of products) {
    const key = `${product.category}-${product.brand}`;
    sequenceMap[key] = (sequenceMap[key] || 0) + 1;
    
    const code = generateProductCode(product.category, product.brand, sequenceMap[key]);
    
    console.log(`Updating product ${product.id} with code ${code}...`);
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ product_code: code })
      .eq('id', product.id);

    if (updateError) {
      console.error(`Error updating product ${product.id}:`, updateError);
    }
  }

  console.log('Migration complete!');
}

migrateProductCodes().catch(console.error);
