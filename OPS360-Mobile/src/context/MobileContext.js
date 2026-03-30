import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const MobileContext = createContext(null);

export function MobileProvider({ children }) {
  const [activePO, setActivePO] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  
  // Phase 2: Audit & Validation logic (Financial Auditor mandate)
  const expectedSerials = useMemo(() => activePO?.items?.flatMap(i => i.serials) || [], [activePO]);

  const validateScan = useCallback((barcode) => {
    // 1. Duplicate Detection
    if (scannedItems.some(i => i.barcode === barcode)) {
      return { success: false, reason: 'DUPLICATE_SERIAL', message: 'This item has already been processed.' };
    }

    // 2. PO Integrity / Expected Serials check
    const isExpected = expectedSerials.length === 0 || expectedSerials.includes(barcode);
    if (!isExpected) {
      return { success: false, reason: 'UNEXPECTED_ITEM', message: 'Item not found in current PO specification.' };
    }

    // 3. Commit the valid scan
    setScannedItems(prev => [...prev, { barcode, timestamp: new Date().toISOString() }]);
    return { success: true, message: 'Item Verified & Logged' };
  }, [expectedSerials, scannedItems]);

  const clearSession = () => {
    setActivePO(null);
    setScannedItems([]);
  };

  return (
    <MobileContext.Provider value={{
      activePO,
      setActivePO,
      scannedItems,
      validateScan,
      clearSession,
      expectedSerials
    }}>
      {children}
    </MobileContext.Provider>
  );
}

export const useMobile = () => useContext(MobileContext);
