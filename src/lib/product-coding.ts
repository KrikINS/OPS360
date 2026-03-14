/**
 * Generates a standardized product code.
 * Format: EHA-[CAT]-[BRN]-[SEQ]
 * 
 * @param category - The product category
 * @param brand - The product brand
 * @param sequence - A 3-digit sequence number
 * @returns The formatted product code
 */
export function generateProductCode(category: string, brand: string, sequence: number): string {
  const cat = (category || "MISC").substring(0, 3).toUpperCase().padEnd(3, 'X');
  const brn = (brand || "GEN").substring(0, 3).toUpperCase().padEnd(3, 'X');
  const seq = sequence.toString().padStart(3, '0');
  
  return `EHA-${cat}-${brn}-${seq}`;
}

/**
 * Gets the next sequence number for a given Category-Brand combination.
 */
export async function getNextSequence(supabase: any, category: string, brand: string): Promise<number> {
  const cat = (category || "MISC").substring(0, 3).toUpperCase().padEnd(3, 'X');
  const brn = (brand || "GEN").substring(0, 3).toUpperCase().padEnd(3, 'X');
  const prefix = `EHA-${cat}-${brn}-`;

  const { data, error } = await supabase
    .from('products')
    .select('product_code')
    .like('product_code', `${prefix}%`)
    .order('product_code', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 1;

  const lastCode = data[0].product_code;
  const lastSeqString = lastCode.split('-').pop();
  const lastSeq = parseInt(lastSeqString || '0', 10);
  
  return lastSeq + 1;
}
