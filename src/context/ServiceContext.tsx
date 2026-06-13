"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getServiceJobs, createServiceJob, updateJobStatus } from '@/actions/service'
import { getStaffDirectory } from '@/actions/hr'

export interface ServiceJob {
  id: string
  jobId: string
  branchId: string
  customerId: string | null
  productId: string | null
  technicianId: string | null
  title: string
  description: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Pending' | 'In-Progress' | 'Awaiting-Spares' | 'Completed' | 'Cancelled'
  estimatedCost: string | null
  actualCost: string | null
  createdAt: Date | null
  updatedAt: Date | null
  customerName: string | null
  customerPhone: string | null
  productName: string | null
  technicianName: string | null
  serialNumber?: string | null
  invoiceId?: string | null
  warrantyStatus?: string
  resolutionNotes?: string | null
  completedAt?: Date | null
  branchName?: string | null
}

interface ServiceContextType {
  jobs: ServiceJob[]
  technicians: { id: string; full_name: string | null }[]
  loading: boolean
  refreshJobs: () => Promise<void>
  refetchJobs: () => Promise<void>
  updateJobStatus: (id: string, status: ServiceJob['status']) => Promise<void>
  createJob: (job: {
    title: string
    description?: string
    priority?: string
    customerId?: string
    productId?: string
    technicianId?: string
    estimatedCost?: number
    serial_number?: string
    invoice_id?: string
    warranty_status?: string
    resolution_notes?: string
  }) => Promise<void>
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined)

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ServiceJob[]>([])
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTechnicians = useCallback(async () => {
    const result = await getStaffDirectory()
    if (result.success) {
      setTechnicians(
        result.staff
          .filter(s => s.role?.toLowerCase() === 'technician')
          .map(s => ({ id: s.userId, full_name: s.fullName ?? null }))
      )
    }
  }, [])

  const refreshJobs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getServiceJobs()
      if (result.success) {
        setJobs(result.jobs as ServiceJob[])
      }
    } catch (err) {
      console.error('Error fetching service jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createJob = async (job: Parameters<typeof createServiceJob>[0]) => {
    const result = await createServiceJob(job)
    if (!result.success) throw new Error(result.error)
    await refreshJobs()
  }

  const handleUpdateJobStatus = async (id: string, status: ServiceJob['status']) => {
    const result = await updateJobStatus({ jobId: id, newStatus: status })
    if (!result.success) throw new Error(result.error)
    await refreshJobs()
  }

  useEffect(() => {
    refreshJobs()
    refreshTechnicians()
  }, [refreshJobs, refreshTechnicians])

  return (
    <ServiceContext.Provider value={{
      jobs,
      technicians,
      loading,
      refreshJobs,
      refetchJobs: refreshJobs,
      updateJobStatus: handleUpdateJobStatus,
      createJob,
    }}>
      {children}
    </ServiceContext.Provider>
  )
}

export const useService = () => {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider')
  }
  return context
}
