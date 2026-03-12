import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench } from "lucide-react"

export default async function ServiceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = 'sales'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) role = profile.role
  }

  const MOCK_JOB_CARDS = [
    { id: "JC-1001", title: "AC Installation", customer: "Rahul V.", status: "Pending", techId: user?.id || "TECH-1" },
    { id: "JC-1002", title: "Washing Machine Repair", customer: "Sneha M.", status: "In Progress", techId: user?.id || "TECH-1" },
    { id: "JC-1003", title: "Refrigerator Service", customer: "Amit R.", status: "Completed", techId: "TECH-2" }
  ]

  let displayJobs = MOCK_JOB_CARDS

  // Restrict visibility for technicians to only their assigned jobs.
  if (role === 'technician') {
     displayJobs = MOCK_JOB_CARDS.filter(job => job.techId === user?.id)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Service Module</h1>
          <p className="text-muted-foreground mt-1">Manage field job cards and repair schedules.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayJobs.map(job => (
          <Card key={job.id} className="shadow-sm border-t-4 border-t-primary">
             <CardHeader className="pb-2">
                 <div className="flex justify-between items-start">
                     <CardTitle className="text-lg">{job.title}</CardTitle>
                     <Badge variant={job.status === 'Completed' ? 'default' : 'outline'}>{job.status}</Badge>
                 </div>
                 <div className="text-xs text-muted-foreground">{job.id}</div>
             </CardHeader>
             <CardContent>
                 <div className="text-sm">
                     <span className="font-semibold">Customer:</span> {job.customer}
                 </div>
                 <div className="text-sm mt-1">
                     <span className="font-semibold">Assigned To:</span> {job.techId === user?.id ? 'You' : job.techId}
                 </div>
             </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
