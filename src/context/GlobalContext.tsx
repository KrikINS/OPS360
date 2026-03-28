"use client"

import React, { createContext, useContext, useState } from 'react'

type Branch = {
  id: string
  name: string
}

type GlobalContextType = {
  activeBranch: Branch | null
  setActiveBranch: (branch: Branch) => void
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export function GlobalProvider({ children, initialBranch }: { children: React.ReactNode, initialBranch: Branch | null }) {
  const [activeBranch, setActiveBranch] = useState<Branch | null>(initialBranch)

  return (
    <GlobalContext.Provider value={{ activeBranch, setActiveBranch }}>
      {children}
    </GlobalContext.Provider>
  )
}

export function useGlobalContext() {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider')
  }
  return context
}
