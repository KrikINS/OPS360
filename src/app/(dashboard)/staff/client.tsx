"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { calculatePayroll } from "@/utils/compliance"
import { Users, IndianRupee, Clock, CheckCircle2 } from "lucide-react"

// Mock Employees Data
const MOCK_STAFF = [
  { id: "E-101", name: "Ramesh Kumar", role: "Delivery Driver", ctc: 300000 },
  { id: "E-102", name: "Priya Sharma", role: "Sales Executive", ctc: 450000 },
  { id: "E-103", name: "Anil Desai", role: "Service Technician", ctc: 380000 }
]

export default function StaffClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const [overtimeHours, setOvertimeHours] = useState<Record<string, number>>({})

  const handleOvertimeChange = (id: string, value: string) => {
    setOvertimeHours(prev => ({ ...prev, [id]: Number(value) }))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Staff & Payroll
          </h1>
          <p className="text-muted-foreground mt-1">
            Indian Compliance Engine: Basic Pay <span className="text-primary font-medium">≥ 50% CTC</span> and Overtime at <span className="text-primary font-medium">2x standard rate</span>.
          </p>
        </div>
        <Badge variant="default" className="text-sm px-4 py-1.5 flex gap-1.5 items-center">
          <CheckCircle2 className="h-4 w-4" /> Compliance Active
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <IndianRupee className="h-5 w-5" />
              Monthly Payroll Processing
            </CardTitle>
            <CardDescription>
              Enter approved overtime hours for the month to calculate final grosses.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead>Monthly CTC</TableHead>}
                  {isAdmin && <TableHead>Basic Pay (≥50%)</TableHead>}
                  <TableHead>Overtime Hours (<Clock className="inline h-3 w-3" />)</TableHead>
                  {isAdmin && <TableHead className="text-right">Total Gross Salary</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_STAFF.map((staff) => {
                  const monthlyCTC = staff.ctc / 12
                  const hours = overtimeHours[staff.id] || 0
                  
                  // Run compliance check
                  const payrollDetails = calculatePayroll(monthlyCTC, hours)

                  return (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        <div>{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.id}</div>
                      </TableCell>
                      <TableCell>{staff.role}</TableCell>
                      {isAdmin && (
                        <TableCell>₹{monthlyCTC.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      )}
                      
                      {isAdmin && (
                        <TableCell>
                          <span className="font-semibold">
                            ₹{payrollDetails.basicPay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {((payrollDetails.basicPay / monthlyCTC) * 100).toFixed(0)}% of CTC
                          </div>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0 hrs"
                            className="w-24"
                            onChange={(e) => handleOvertimeChange(staff.id, e.target.value)}
                          />
                          {hours > 0 && isAdmin && (
                            <div className="text-[10px] text-primary flex flex-col uppercase font-semibold">
                              <span>+ ₹{payrollDetails.overtimePay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                              <span className="opacity-70">(2x Rate)</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      {isAdmin && (
                        <TableCell className="text-right">
                          <span className="font-bold text-lg text-primary bg-primary/10 px-3 py-1 rounded-md">
                            ₹{payrollDetails.grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
