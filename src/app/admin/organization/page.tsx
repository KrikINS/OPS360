"use client"

import { useState } from 'react'
import { Building2, Paintbrush } from 'lucide-react'
import { OrganizationTab } from '@/components/admin/tabs/organization-tab'
import { BrandingTab } from '@/components/admin/tabs/branding-tab'

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('branches')

  const tabs = [
    { id: 'branches', label: 'Branch Registry', icon: Building2 },
    { id: 'branding', label: 'Company Branding', icon: Paintbrush },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organization Registry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage branches, distribution centers, and company identity.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'branches' && <OrganizationTab />}
      {activeTab === 'branding' && <BrandingTab />}
    </div>
  )
}
