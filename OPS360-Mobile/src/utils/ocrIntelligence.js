import Tesseract from 'tesseract.js';

// Phase 2: Pattern Matching (@DB-ARCHITECT mandated)
// Standard format for Ethan Home Appliances serials
const SERIAL_PATTERN = /ETH-[A-Z0-9]{4}-202[0-9]/;

/**
 * Audit-specific Regex extraction and Partial Matching
 */
export const performAuditOCR = async (imageUri, expectedSerials = []) => {
  try {
    // 1. Text Recognition (Tesseract.js)
    const { data: { text } } = await Tesseract.recognize(imageUri, 'eng');
    
    // 2. Pattern Filtering (@DB-ARCHITECT)
    // Extract everything that looks like an Ethan Serial
    const rawMatches = text.match(new RegExp(SERIAL_PATTERN.source, 'g')) || [];
    
    if (rawMatches.length === 0) {
      return { success: false, message: 'No valid serial numbers detected in image.' };
    }

    const detectedSerial = rawMatches[0];

    // 3. Audit Verification (@FINANCIAL-AUDITOR)
    // Check for exact match first
    if (expectedSerials.includes(detectedSerial)) {
        return { success: true, data: detectedSerial, exact: true };
    }

    // Check for "Partial Match" (Levenshtein/Fuzzy check)
    // If exact match fails, find the closest expected serial
    const closest = expectedSerials.find(s => isPartialMatch(s, detectedSerial));
    
    if (closest) {
        return { 
          success: true, 
          data: closest, 
          exact: false, 
          suggested: true, 
          original: detectedSerial 
        };
    }

    return { success: true, data: detectedSerial, exact: false, suggested: false };

  } catch (error) {
    console.error('OCR Processing Crash:', error);
    return { success: false, message: 'Intelligence Hub failed to parse image.' };
  }
};

// Simple distance check: If 1 character off, it's a partial match
const isPartialMatch = (s1, s2) => {
    if (Math.abs(s1.length - s2.length) > 1) return false;
    let distance = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        if (s1[i] !== s2[i]) distance++;
    }
    return distance <= 1; 
};
