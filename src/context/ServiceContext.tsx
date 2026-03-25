"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Customer {
  id: string
  full_name: string
  phone: string
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
  const supabase = createClient()

  const refreshTechnicians = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'technician')
    
    if (!error && data) setTechnicians(data)
  }, [supabase])

  const refreshJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select(`
          *,
          customer:customers(id, full_name, phone),
          product:products(id, model_name, brand),
          technician:profiles!service_jobs_technician_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

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
  }, [supabase])

  const createJob = async (job: Partial<ServiceJob>) => {
    try {
      const { error } = await supabase
        .from('service_jobs')
        .insert([job])

      if (error) throw error
      await refreshJobs()
    } catch (err) {
      console.error('Error creating job:', err)
      throw err
    }
  }

  const updateJobStatus = async (id: string, status: ServiceJob['status']) => {
    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

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
