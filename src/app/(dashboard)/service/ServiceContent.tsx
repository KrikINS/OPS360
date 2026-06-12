"use client"

import { useService } from "@/context/ServiceContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, AlertCircle, CheckCircle2, MoreVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateJobModal } from "@/components/service/CreateJobModal"
import { JobDetailDrawer } from "@/components/service/JobDetailDrawer"
import { useState } from "react"
import type { ServiceJob } from "@/context/ServiceContext"

export function ServiceContent() {
  const { jobs, loading, refetchJobs } = useService()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<ServiceJob | null>(null)

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="shadow-sm">
              <CardHeader><Skeleton className="h-20 w-full" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20">
            <Wrench className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Service Hub</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Operational Control: Repair & Installation Registry</p>
          </div>
        </div>
        <Button 
          className="bg-[#001529] hover:bg-[#002545] text-white font-bold gap-2 px-6 h-12 rounded-xl shadow-lg transition-all active:scale-95"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-5 w-5" />
          CREATE JOB CARD
        </Button>
      </div>

      <CreateJobModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <JobDetailDrawer 
        job={selectedJob} 
        open={!!selectedJob} 
        onClose={() => setSelectedJob(null)} 
        onUpdated={refetchJobs} 
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-muted-foreground/20">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Active Jobs</h3>
              <p className="text-muted-foreground text-sm">System ready for new service intake.</p>
            </div>
          </div>
        ) : (
          jobs.map(job => (
            <Card key={job.id} onClick={() => setSelectedJob(job)} className="group hover:shadow-xl transition-all duration-300 border-t-0 overflow-hidden rounded-2xl border-white/40 bg-white/80 backdrop-blur-md cursor-pointer">
              <div className={`h-1.5 w-full ${
                job.priority === 'Urgent' ? 'bg-red-500' : 
                job.priority === 'High' ? 'bg-orange-500' : 
                'bg-primary'
              }`} />
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black py-0.5 px-2 bg-slate-200 rounded text-slate-600 uppercase tracking-tighter">
                        {job.jobId}
                      </span>
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase ${
                        job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        job.status === 'In-Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {job.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
                      {job.title}
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">
                  {job.description || 'No detailed log provided.'}
                </p>
                
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Customer</span>
                    <span className="font-semibold text-slate-700">{job.customerName || 'Walk-in'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Platform</span>
                    <span className="font-semibold text-slate-700">{job.productName || 'General Inquiry'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Lead Tech</span>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {job.technicianName?.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-700">{job.technicianName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2 flex items-center justify-between border-t border-slate-50 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span className="font-bold uppercase tracking-tighter">Opened: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {job.status === 'Completed' ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-black uppercase tracking-widest">
                      <CheckCircle2 size={12} />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-blue-600 font-black uppercase tracking-widest">
                      <Clock size={12} className="animate-pulse" />
                      Active
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
