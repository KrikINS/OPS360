"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ModernOrbitSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export const ModernOrbitSpinner = ({ className, size = "md" }: ModernOrbitSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10"
  }

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Outer Scanning Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-white/40 animate-[spin_1.5s_linear_infinite]" />
      
      {/* Inner Pulsing Core */}
      <div className={cn(
        "rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse",
        size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5"
      )} />
      
      {/* Orbiting Satellite Dot */}
      <div className="absolute inset-[-4px] animate-[spin_0.8s_linear_infinite]">
        <div className={cn(
          "rounded-full bg-[#7FD1E3] shadow-[0_0_8px_#7FD1E3]",
          size === "sm" ? "h-0.5 w-0.5" : "h-1 w-1"
        )} />
      </div>

      {/* Holographic Subtle Scan Line */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent h-[1px] w-full animate-[bounce_2s_ease-in-out_infinite] opacity-20" />
    </div>
  )
}
