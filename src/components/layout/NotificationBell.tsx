"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"
import { getPendingApprovalsAction, type Notification } from "@/app/actions/notifications"
import { Menu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

const PRIORITY_DOT: Record<Notification['priority'], string> = {
  high:   'bg-rose-500',
  medium: 'bg-amber-500',
  low:    'bg-blue-400',
}

const PRIORITY_BADGE: Record<Notification['priority'], string> = {
  high:   'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-blue-100 text-blue-700',
}

const PRIORITY_LABEL: Record<Notification['priority'], string> = {
  high:   'Urgent',
  medium: 'Action needed',
  low:    'Info',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [viewedInfoIds, setViewedInfoIds] = useState<string[]>([])

  useEffect(() => {
    const fetchNotifications = async () => {
      const data = await getPendingApprovalsAction()
      setNotifications(data)
    }
    fetchNotifications()

    const interval = setInterval(fetchNotifications, 60000)

    const handleUpdate = () => fetchNotifications()
    window.addEventListener('notifications-updated', handleUpdate)
    window.addEventListener('vendor-updated', handleUpdate)

    const stored = localStorage.getItem('viewedInfoIds')
    if (stored) {
      try {
        setViewedInfoIds(JSON.parse(stored))
      } catch (e) {}
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications-updated', handleUpdate)
      window.removeEventListener('vendor-updated', handleUpdate)
    }
  }, [])

  const markAsViewed = (id: string) => {
    if (!viewedInfoIds.includes(id)) {
      const newViewed = [...viewedInfoIds, id]
      setViewedInfoIds(newViewed)
      localStorage.setItem('viewedInfoIds', JSON.stringify(newViewed))
    }
  }

  const highCount = notifications.filter(n => n.priority === 'high').length
  const activeCount = notifications.filter(n => n.priority !== 'low' || !viewedInfoIds.includes(n.id)).length

  return (
    <Menu.Root>
      <Menu.Trigger className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Bell className="h-5 w-5" />
        {activeCount > 0 && (
          <span className={cn(
            "absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-[#001529]",
            highCount > 0 ? "bg-rose-500" : "bg-amber-500"
          )}>
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="isolate z-50 outline-none">
          <Menu.Popup className={cn(
            "z-50 min-w-80 w-80 max-h-[80vh] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "bg-white"
          )}>
            <div className="font-bold flex items-center justify-between px-3 py-2 text-sm border-b border-slate-100">
              <span>Notifications</span>
              {activeCount > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {activeCount} pending
                </span>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto py-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No pending items. You&apos;re all caught up!
                </div>
              ) : (
                notifications.map(n => (
                  <Menu.Item
                    key={n.id}
                    render={<Link href={n.href} onClick={() => n.priority === 'low' && markAsViewed(n.id)} />}
                    className={cn(
                      "flex flex-col gap-1 w-full p-3 outline-none cursor-pointer hover:bg-slate-50 focus:bg-slate-50 border-b border-slate-100 last:border-0 select-none data-disabled:pointer-events-none data-disabled:opacity-50",
                      n.priority === 'low' && viewedInfoIds.includes(n.id) ? "opacity-60 bg-slate-50/50" : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", PRIORITY_DOT[n.priority])} />
                      <span className="font-semibold text-sm flex-1 truncate">{n.title}</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", PRIORITY_BADGE[n.priority])}>
                        {PRIORITY_LABEL[n.priority]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-4 truncate w-full block">
                      {n.message}
                    </span>
                  </Menu.Item>
                ))
              )}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

