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
    return match ? match[1].trim().replace(/^"(.*)"$/, '$1') : null;
  } catch {
    return null;
  }
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function cleanJson(content) {
  const startIdx = content.search(/[\{\[]/);
  return startIdx === -1 ? content : content.substring(startIdx);
}

function cleanCsv(content) {
  const startIdx = content.indexOf('Brand,Category,Item Name');
  return startIdx === -1 ? content : content.substring(startIdx);
}

async function main() {
  console.log('--- RESTORE START ---');
  
  // 1. Branches
  const bPath = path.resolve(__dirname, '../branches_full.json');
  if (fs.existsSync(bPath)) {
    let content = fs.readFileSync(bPath, 'utf16le').replace(/^\uFEFF/, '');
    content = cleanJson(content);
    try {
      const data = JSON.parse(content);
      const list = Array.isArray(data) ? data : (data.branches || []);
      console.log(`Processing ${list.length} branches...`);
      for (const b of list) {
        await supabase.from('branches').upsert({
          name: b.name,
          location: b.location || '',
          code: b.code || '',
          full_address: b.full_address || b.address || '',
          city: b.city || '',
          state: b.state || 'Kerala',
          state_code: b.state_code || '32',
          pincode: b.pincode || '',
          gstin: b.gstin || ''
        }, { onConflict: 'name' });
      }
    } catch (e) { console.error('Error branches:', e.message); }
  }

  // 2. Products
  const pPath = path.resolve(__dirname, '../products_list.json');
  if (fs.existsSync(pPath)) {
    let content = fs.readFileSync(pPath, 'utf16le').replace(/^\uFEFF/, '');
    content = cleanJson(content);
    try {
      const data = JSON.parse(content);
      const list = Array.isArray(data) ? data : (data.products || []);
      console.log(`Processing ${list.length} products...`);
      for (const p of list) {
        await supabase.from('products').upsert({
          model_name: p.model_name,
          brand: p.brand,
          category: p.category,
          hsn_code: p.hsn_code,
          base_price: p.base_price || 0,
          product_code: p.product_code,
          tax_rate: p.tax_rate ?? 18.0,
          tracking_type: p.tracking_type || 'Stocked'
        }, { onConflict: 'product_code' });
      }
    } catch (e) { console.error('Error products:', e.message); }
  }

  // 3. Vendors
  console.log('Ensuring vendors...');
  const vendors = [
    { name: 'Global Tech Solutions', trade_name: 'GTS', email: 'sales@globaltech.com', status: 'approved', gstin: '32AAAAA0000A1Z1' },
    { name: 'Sunrise Electronics', trade_name: 'Sunrise', email: 'orders@sunrise.in', status: 'approved', gstin: '32AAAAA0000A1Z2' },
    { name: 'Ethan Direct Supply', trade_name: 'EHA Direct', email: 'supply@ethan.in', status: 'approved', gstin: '32AAAAA0000A1Z3' }
  ];
  for (const v of vendors) {
    await supabase.from('vendors').upsert(v, { onConflict: 'name' });
  }

  // 4. Inventory
  const cPath = path.resolve(__dirname, '../mock_qa_mission.csv');
  if (fs.existsSync(cPath)) {
    let content = fs.readFileSync(cPath, 'utf16le').replace(/^\uFEFF/, '');
    content = cleanCsv(content);
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.trim());
      const { data: ps } = await supabase.from('products').select('id, model_name');
      const { data: bs } = await supabase.from('branches').select('id, name');
      const pMap = Object.fromEntries((ps || []).map(p => [p.model_name.toLowerCase(), p.id]));
      const bMap = Object.fromEntries((bs || []).map(b => [b.name.toLowerCase(), b.id]));

      console.log(`Processing ${lines.length - 1} inventory items...`);
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => row[h] = vals[idx]?.trim());
        const pId = pMap[row['Item Name']?.toLowerCase()];
        const bId = bMap[row['Branch']?.toLowerCase()];
        if (pId && bId && row['Serial Number']) {
          await supabase.from('inventory').upsert({
            serial_number: row['Serial Number'],
            product_id: pId,
            branch_id: bId,
            landed_cost: parseFloat(row['Estimated Cost']) || 0,
            price: parseFloat(row['Estimated Cost']) || 0,
            status: 'Available'
          }, { onConflict: 'serial_number' });
        }
      }
    }
  }

  console.log('--- RESTORE END ---');
}

main().catch(console.error);
