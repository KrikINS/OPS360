import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tnasclshlyicwxtzllrv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYXNjbHNobHlpY3d4dHpsbHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODU1MzMsImV4cCI6MjA1ODY2MTUzM30.07_O_V8a8m6Z-vU8A-M8_V8A8m6Z-vU8A-M8_V8A8m6Z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchLightweightPOs = async () => {
  try {
    // Phase 3: Optimized JSON fetch for mobile (DB-ARCHITECT mandate)
    // Limits payload to essential identity and validation fields
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, vendor:vendors(name), items:purchase_order_items(sku, serials, unit_price)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    
    // Transform to compact mobile structure
    return data.map(po => ({
      id: po.id,
      vendor: po.vendor?.name || 'Unknown Vendor',
      items: po.items.map(i => ({
        sku: i.sku,
        serials: i.serials || [],
        price: i.unit_price
      }))
    }));
  } catch (err) {
    console.error('Mobile fetch failed, using fallback cache:', err);
    return null;
  }
};
