"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { StaffRow } from "@/actions/hr"

export default function StaffClient({
  isAdmin = false,
  staff = [],
}: {
  isAdmin?: boolean
  staff: StaffRow[]
}) {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Staff Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'All staff across all branches.' : 'Staff in your branch.'}
          </p>
        </div>
        <Badge variant="default" className="text-sm px-4 py-1.5">
          {staff.length} {staff.length === 1 ? 'member' : 'members'}
        </Badge>
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            Staff Members
          </CardTitle>
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
    </div>
  )
}
