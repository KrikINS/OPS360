"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'


interface Customer {
  id: string
  full_name: string
  phone_number: string
}

interface Product {
  id: string
  model_name: string
  brand: string
}

export interface ServiceJob {
  id: string
  job_id: string
  customer_id: string
  product_id: string | null
  branch_id: string
  technician_id: string | null
  title: string
  description: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Pending' | 'In-Progress' | 'Awaiting-Spares' | 'Completed' | 'Cancelled'
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
  technician_name?: string
}

interface ServiceContextType {
  jobs: ServiceJob[]
  technicians: { id: string, full_name: string | null }[]
  loading: boolean
  refreshJobs: () => Promise<void>
  updateJobStatus: (id: string, status: ServiceJob['status']) => Promise<void>
  createJob: (job: Partial<ServiceJob>) => Promise<void>
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined)

interface RawServiceJob extends ServiceJob {
  technician: { full_name: string | null } | null
}

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ServiceJob[]>([])
  const [technicians, setTechnicians] = useState<{ id: string, full_name: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  

  const refreshTechnicians = useCallback(async () => {
    const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("profiles"))
    if (!error && data) {
      setTechnicians((data as typeof import("@/db/schema").profiles.$inferSelect[]).filter(p => p.role === 'technician'))
    }
  }, [])

  const refreshJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("service_jobs"))

      if (error) throw error

      const rawData = data as unknown as RawServiceJob[]
      const mappedJobs: ServiceJob[] = rawData.map((job) => ({
        ...job,
        technician_name: job.technician?.full_name || 'Unassigned'
      }))

      setJobs(mappedJobs)
    } catch (err) {
      console.error('Error fetching service jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createJob = async (job: Partial<ServiceJob>) => {
    try {
      const serializable = Object.fromEntries(
        Object.entries(job).filter(([, v]) => v !== undefined && typeof v !== 'object' || v === null)
      )
      const { error } = await import("@/app/actions/generics").then(m => m.insertData("service_jobs", [serializable as Record<string, string | number | boolean | null>]))

      if (error) throw error
      await refreshJobs()
    } catch (err) {
      console.error('Error creating job:', err)
      throw err
    }
  }

  const updateJobStatus = async (id: string, status: ServiceJob['status']) => {
    try {
      const { error } = await import("@/app/actions/generics").then(m => m.updateData("service_jobs", { id, status, updated_at: new Date().toISOString() }))

      if (error) throw error
      await refreshJobs()
    } catch (err) {
      console.error('Error updating job status:', err)
    }
  }

  useEffect(() => {
    refreshJobs()
    refreshTechnicians()
  }, [refreshJobs, refreshTechnicians])

  return (
    <ServiceContext.Provider value={{ jobs, technicians, loading, refreshJobs, updateJobStatus, createJob }}>
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
