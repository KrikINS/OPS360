import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden h-screen flex flex-col">
        <header className="h-14 flex items-center px-4 border-b bg-background gap-4">
          <SidebarTrigger />
          <div className="font-semibold text-lg">Ops360 Dashboard</div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/30">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
