"use client"

import React, { createContext, useContext } from 'react'

type BrandingSettings = {
  companyName: string
  logoUrl: string
  primaryColor: string
  supportEmail: string
  billingAddress: string
}

const defaultBranding: BrandingSettings = {
  companyName: "AppTerra",
  logoUrl: "/AppTerra Logo.PNG",
  primaryColor: "#0b3256",
  supportEmail: "info@myappterra.com",
  billingAddress: "3945 Ibn Shaddad, Malaz, Riyadh"
}

const GlobalBrandingContext = createContext<BrandingSettings>(defaultBranding)

export function useBranding() {
  return useContext(GlobalBrandingContext)
}

interface GlobalBrandingProviderProps {
  children: React.ReactNode
  settings?: any // Allow generic settings from db
}

export function GlobalBrandingProvider({ children, settings }: GlobalBrandingProviderProps) {
  const branding: BrandingSettings = {
    companyName: settings?.company_name || defaultBranding.companyName,
    logoUrl: settings?.logo_url || defaultBranding.logoUrl,
    primaryColor: settings?.primary_color || defaultBranding.primaryColor,
    supportEmail: settings?.support_email || defaultBranding.supportEmail,
    billingAddress: settings?.billing_address || defaultBranding.billingAddress,
  }

  return (
    <GlobalBrandingContext.Provider value={branding}>
      {children}
    </GlobalBrandingContext.Provider>
  )
}
