"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react"
import { clockIn, clockOut, getMyAttendance } from "@/actions/hr"

type ClockStatus = 'loading' | 'not-started' | 'clocked-in' | 'clocked-out'

// Matches the raw attendance_records row returned by the actions
type TodayRecord = {
  id: string
  clock_in: Date
  clock_out: Date | null
  duration_minutes: number | null
}

function formatElapsed(startTime: Date): string {
  const diffMs = Date.now() - new Date(startTime).getTime()
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':')
}

function formatTime(dt: Date | null): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export default function ClockWidget() {
  const [status, setStatus] = useState<ClockStatus>('loading')
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null)
  const [elapsed, setElapsed] = useState<string>('00:00:00')
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  // Load today's attendance on mount
  useEffect(() => {
    async function loadToday() {
      const today = new Date().toISOString().split('T')[0]
      const result = await getMyAttendance({ fromDate: today, toDate: today })
      if (result.success && result.records.length > 0) {
        const record = result.records[0] as TodayRecord
        setTodayRecord(record)
        setStatus(record.clock_out ? 'clocked-out' : 'clocked-in')
      } else {
        setStatus('not-started')
      }
    }
    loadToday()
  }, [])

  // Live elapsed timer when clocked in
  useEffect(() => {
    if (status !== 'clocked-in' || !todayRecord?.clock_in) return
    const interval = setInterval(() => {
      setElapsed(formatElapsed(todayRecord.clock_in))
    }, 1000)
    setElapsed(formatElapsed(todayRecord.clock_in))
    return () => clearInterval(interval)
  }, [status, todayRecord?.clock_in])

  function handleClockIn() {
    setError('')
    startTransition(async () => {
      const result = await clockIn()
      if (result.success) {
        setTodayRecord(result.record as TodayRecord)
        setStatus('clocked-in')
      } else {
        setError(result.error ?? 'Failed to clock in')
      }
    })
  }

  function handleClockOut() {
    setError('')
    startTransition(async () => {
      const result = await clockOut()
      if (result.success) {
        setTodayRecord(result.record as TodayRecord)
        setStatus('clocked-out')
      } else {
        setError(result.error ?? 'Failed to clock out')
      }
    })
  }

  const statusConfig = {
    loading:        { label: 'Loading…',    color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'not-started':  { label: 'Not Started', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'clocked-in':   { label: 'On Shift',    color: 'bg-green-100 text-green-800 border-green-200' },
    'clocked-out':  { label: 'Shift Ended', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  }

  const { label, color } = statusConfig[status]

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Today&apos;s Shift
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="outline" className={color}>{label}</Badge>
        </div>

        {/* Clock-in time */}
        {todayRecord && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clocked in</span>
            <span className="text-sm font-medium">
              {formatTime(todayRecord.clock_in)}
            </span>
          </div>
        )}

        {/* Live elapsed timer while on shift */}
        {status === 'clocked-in' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Elapsed</span>
            <span className="text-sm font-mono font-medium tabular-nums">
              {elapsed}
            </span>
          </div>
        )}

        {/* Clock-out time and total duration after shift ends */}
        {status === 'clocked-out' && todayRecord && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clocked out</span>
              <span className="text-sm font-medium">
                {formatTime(todayRecord.clock_out)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-sm font-medium">
                {formatDuration(todayRecord.duration_minutes)}
              </span>
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* Action button */}
        {status === 'not-started' && (
          <Button
            className="w-full"
            onClick={handleClockIn}
            disabled={isPending}
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clocking in…</>
              : <><LogIn className="h-4 w-4 mr-2" />Clock In</>
            }
          </Button>
        )}

        {status === 'clocked-in' && (
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            onClick={handleClockOut}
            disabled={isPending}
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clocking out…</>
              : <><LogOut className="h-4 w-4 mr-2" />Clock Out</>
            }
          </Button>
        )}

        {status === 'clocked-out' && (
          <p className="text-xs text-center text-muted-foreground">
            Shift complete. Contact your manager to make corrections.
          </p>
        )}

      </CardContent>
    </Card>
  )
}
