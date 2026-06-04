"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, Activity, Plus } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useSearchParams, useRouter } from "next/navigation"
import type { StaffRow } from "@/actions/hr"

import ClockWidget from "@/components/hr/ClockWidget"
import ActivityClient from "./activity/client"
import { AddOfflineStaffModal } from "@/components/hr/AddOfflineStaffModal"

type ActivityRow = {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  userRole: string
  branchId: string | null
  module: string
  actionType: string
  description: string
  referenceId: string | null
}

type AttendanceRecord = {
  id: string
  date: string
  fullName?: string | null
  clockIn?: string | Date | null
  clockOut?: string | Date | null
  durationMinutes?: number | null
  clock_in?: string | Date | null
  clock_out?: string | Date | null
  duration_minutes?: number | null
}

export default function StaffClient({
  isAdmin = false,
  isManager = false,
  staff = [],
  activities = [],
  attendance = [],
  currentUserId,
}: {
  isAdmin?: boolean
  isManager?: boolean
  staff: StaffRow[]
  activities: ActivityRow[]
  attendance: AttendanceRecord[]
  currentUserId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "registry"
  
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Human Resources
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage personnel, attendance, and activity logs across all branches.' : 'Manage personnel in your branch.'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => router.push(`/staff?tab=${v}`)} className="w-full space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
          <TabsTrigger 
            value="registry"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"
          >
            <Users className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger 
            value="attendance"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"
          >
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger 
            value="activity"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"
          >
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-0 outline-none">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5" />
                Staff Members
              </CardTitle>
              {isAdmin && (
                <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Offline Staff
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {staff.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No staff members found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={`${member.userId}-${member.branchId ?? 'none'}`}>
                        <TableCell className="font-medium">
                          {member.fullName ?? <span className="text-muted-foreground italic">No name</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.role ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {member.email ?? '—'}
                        </TableCell>
                        <TableCell>
                          {member.branchName ?? <span className="text-muted-foreground italic">Unassigned</span>}
                          {member.isPrimary && (
                            <span className="ml-1 text-[10px] text-primary font-semibold uppercase">Primary</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 outline-none space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ClockWidget />
            </div>
            <div className="md:col-span-2">
              <Card className="shadow-md h-full">
                <CardHeader className="bg-muted/30 border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Historic Attendance Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {attendance.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No attendance records found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((rec: AttendanceRecord) => (
                          <TableRow key={rec.id}>
                            <TableCell className="text-xs">{rec.date}</TableCell>
                            <TableCell className="font-medium text-xs">{rec.fullName ?? 'You'}</TableCell>
                            <TableCell className="text-xs">
                              {rec.clockIn || rec.clock_in
                                ? new Date((rec.clockIn ?? rec.clock_in) as string | Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="text-xs">
                              {rec.clockOut || rec.clock_out 
                                ? new Date((rec.clockOut ?? rec.clock_out) as string | Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="text-xs">
                              {(rec.durationMinutes ?? rec.duration_minutes) != null
                                ? `${Math.floor(((rec.durationMinutes ?? rec.duration_minutes) as number) / 60)}h ${((rec.durationMinutes ?? rec.duration_minutes) as number) % 60}m`
                                : '—'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 outline-none">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <ActivityClient 
              activities={activities}
              staff={staff}
              isAdmin={isAdmin}
              isManager={isManager}
              currentUserId={currentUserId}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      {isAdmin && <AddOfflineStaffModal open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  )
}
