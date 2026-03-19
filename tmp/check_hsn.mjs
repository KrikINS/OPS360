import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !key) {
  console.error("Missing supabase URL or KEY");
  process.exit(1);
}

async function checkHSN() {
  const res = await fetch(`${url}/rest/v1/products?select=id,model_name,hsn_code`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch products:", await res.text());
    process.exit(1);
  }

  const products = await res.json();
  const errors = [];

  for (const p of products) {
    if (!p.hsn_code) continue; 
    const val = p.hsn_code.toString().trim();
    if (!/^\d{8}$/.test(val)) {
      errors.push({ id: p.id, model_name: p.model_name, hsn_code: p.hsn_code });
    }
  }

  if (errors.length > 0) {
    console.log(`\nFound ${errors.length} products with invalid HSN codes:`);
    console.table(errors);
  } else {
    console.log("\n✅ All existing HSN codes are valid (strictly 8-digit numeric).");
  }
}

checkHSN();
