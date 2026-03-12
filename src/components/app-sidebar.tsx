import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Package, Truck, Calculator, Users, Wrench, ShoppingCart, ArrowRightLeft } from "lucide-react"
import Image from "next/image"

const items = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Procurement", url: "/procurement", icon: Truck },
  { title: "POS", url: "/pos", icon: ShoppingCart },
  { title: "Inter-Branch Transfer", url: "/transfer", icon: ArrowRightLeft },
  { title: "Logistics", url: "/logistics", icon: Truck },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Staff", url: "/staff", icon: Users },
  { title: "Service", url: "/service", icon: Wrench },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3 mt-4 mb-2 font-bold text-xl text-primary-foreground bg-primary rounded-lg mx-2">
          <div className="bg-white p-1 rounded-md shrink-0">
            <Image src="/ethan-logo.png" alt="Ethan Logo" width={24} height={24} priority className="rounded-sm" />
          </div>
          <span className="truncate">Ops360 ERP</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <a href={item.url} className="block">
                    <SidebarMenuButton>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </a>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
