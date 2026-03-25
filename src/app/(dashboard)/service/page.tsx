"use client"

import { ServiceProvider } from "@/context/ServiceContext"
import { ServiceContent } from "./ServiceContent"

export default function ServiceDashboard() {
  return (
    <ServiceProvider>
      <ServiceContent />
    </ServiceProvider>
  )
}
