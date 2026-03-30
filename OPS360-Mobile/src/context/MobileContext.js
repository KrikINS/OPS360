import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const MobileContext = createContext(null);

export function MobileProvider({ children }) {
  const [activePO, setActivePO] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  
  // Phase 2: Expected serials & Price lock
  const expectedSerials = useMemo(() => activePO?.items?.flatMap(i => i.serials) || [], [activePO]);

  const commitScan = useCallback((barcode) => {
    // Phase 2 check logic
    return { success: true, message: 'Scanned' };
  }, [expectedSerials]);

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
