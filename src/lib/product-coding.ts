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
