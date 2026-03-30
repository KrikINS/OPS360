import React, { createContext, useContext, useState, useCallback } from 'react';

const MobileContext = createContext(null);

export function MobileProvider({ children }) {
  const [activePO, setActivePO] = useState(null);
  
  const commitScan = useCallback((barcode) => {
    console.log('Validating barcode:', barcode);
    // Phase 2 check logic
    return { success: true, message: 'Scanned' };
  }, []);

  return (
    <MobileContext.Provider value={{
      activePO,
      setActivePO,
      scannedItems,
      commitScan,
    }}>
      {children}
    </MobileContext.Provider>
  );
}

export const useMobile = () => useContext(MobileContext);
