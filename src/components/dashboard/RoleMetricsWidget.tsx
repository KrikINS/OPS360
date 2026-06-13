"use client"

import React from "react"
import useSWR from "swr"
import { getRoleMetricsAction } from "@/app/actions/stats"
import { Activity, LayoutDashboard } from "lucide-react"


export function RoleMetricsWidget() {
  const { data: response, error, isLoading } = useSWR('role-metrics', getRoleMetricsAction)

  const metrics = response?.data || {}
  const metricKeys = Object.keys(metrics)

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 mb-4">
        <div className="flex items-center gap-2 mb-2 text-white/50">
          <Activity className="w-3 h-3" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Loading Metrics...</span>
        </div>
        <div className="flex overflow-x-hidden gap-3 pb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 min-w-[200px] flex-shrink-0 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || response?.error) {
    return null // Fail silently or display error if needed
  }

  if (metricKeys.length === 0) return null

  return (
    <div className="w-full max-w-7xl mx-auto px-6 mb-4">
      <div className="flex items-center gap-2 mb-2 text-white/50">
        <LayoutDashboard className="w-3 h-3 text-[#7FD1E3]" />
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Your Overview</span>
      </div>
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {metricKeys.map((key) => {
          const metric = metrics[key]
          return (
            <div 
              key={key} 
              className="relative overflow-hidden group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 hover:border-[#7FD1E3]/30 transition-all duration-500 shadow-xl min-w-[200px] flex-shrink-0 snap-start"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-8 h-8 text-[#7FD1E3]" />
              </div>
              <div className="relative z-10">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">
                  {metric.label}
                </p>
                <h3 className="text-xl font-black tracking-tight text-white group-hover:text-[#7FD1E3] transition-colors truncate">
                  {metric.value}
                </h3>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
