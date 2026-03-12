"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"
import { Activity, ClockAlert, Store } from "lucide-react"

// Mock Data for Phase 8 Verifications
const salesVelocityData = [
  { date: "Mar 01", main: 450000, branchA: 200000, branchB: 150000 },
  { date: "Mar 02", main: 500000, branchA: 220000, branchB: 180000 },
  { date: "Mar 03", main: 480000, branchA: 250000, branchB: 160000 },
  { date: "Mar 04", main: 600000, branchA: 280000, branchB: 200000 },
  { date: "Mar 05", main: 550000, branchA: 300000, branchB: 210000 },
  { date: "Mar 06", main: 700000, branchA: 350000, branchB: 240000 },
  { date: "Mar 07", main: 650000, branchA: 320000, branchB: 220000 },
]

const agingData = [
  { category: "Refrigerators", ">30 Days": 15, ">60 Days": 8, ">90 Days": 2 },
  { category: "ACs", ">30 Days": 25, ">60 Days": 12, ">90 Days": 4 },
  { category: "Washing Machines", ">30 Days": 10, ">60 Days": 5, ">90 Days": 1 },
  { category: "Microwaves", ">30 Days": 30, ">60 Days": 15, ">90 Days": 6 },
]

const branchPerformanceData = [
  { name: "Main HQ", value: 65 },
  { name: "Satellite A", value: 20 },
  { name: "Satellite B", value: 15 },
]

const COLORS = ['#001529', '#0ea5e9', '#38bdf8']

export default function AdminDashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Activity className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Intelligence</h1>
          <p className="text-muted-foreground mt-1">Real-time macro analytics and insights across all branches.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Metric 1: Sales Velocity */}
        <Card className="col-span-1 lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Sales Velocity (INR)
            </CardTitle>
            <CardDescription>Daily revenue trajectories across the branch network (Last 7 Days)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesVelocityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="main" name="Main HQ" stroke="#001529" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="branchA" name="Branch A" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="branchB" name="Branch B" stroke="#94a3b8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Metric 2: Inventory Aging */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockAlert className="h-5 w-5 text-amber-500" /> Inventory Aging
            </CardTitle>
            <CardDescription>Stale structural stock identified by product category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey=">30 Days" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                <Bar dataKey=">60 Days" fill="#fb923c" radius={[4, 4, 0, 0]} />
                <Bar dataKey=">90 Days" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Metric 3: Branch Performance */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" /> Revenue Distribution
            </CardTitle>
            <CardDescription>Total percentage share of revenue by branch.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex justify-center items-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={branchPerformanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {branchPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Share']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                </PieChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
