"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Shield, User, Lock, AlertTriangle, Copy, Check, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Profile } from "@/app/admin/users/page"

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSave: (updatedProfile: Profile) => Promise<void>;
  currentUserRole: string | null;
}

const MODULE_REGISTERS: Record<string, string[]> = {
  pos: ["Terminal", "Order History", "Settlements"],
  inventory: ["Inventory Registry", "Product Master", "Transfer Control"],
  procurement: ["PO Registry", "3-Way Match", "Vendor Directory"],
  sales: ["POS", "Sales Registry", "Returns Registry", "Customer Master"],
  finance: ["General Ledger", "Expense Tracker", "Tax Center"],
  service: ["Service Tickets", "Technician Portal", "Spares Management"],
  admin: ["User Management", "Branch Settings", "Audit Logs"],
  hr: ["Personnel Registry", "Payroll", "Attendance"],
}

export function UserProfileModal({
  open,
  onOpenChange,
  profile,
  onSave,
  currentUserRole
}: UserProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Profile | null>(null)
  
  // Password Reset State
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const isAdmin = currentUserRole === "Admin/Owner"

  useEffect(() => {
    if (profile && open) {
      setFormData({
        ...profile,
        register_permissions: profile.register_permissions || {}
      })
    }
  }, [profile, open])

  if (!formData) return null

  const handleBasicInfoChange = (field: keyof Profile, value: string) => {
    setFormData((prev) => prev ? ({ ...prev, [field]: value }) : null)
  }

  const toggleRegisterLevel = (module: string, register: string, next: 'view' | 'edit') => {
    const key = register.toLowerCase().replace(/ /g, "_")
    
    setFormData((prev) => {
      if (!prev) return null
      const modulePerms = prev.register_permissions?.[module] || {}
      return {
        ...prev,
        register_permissions: {
          ...(prev.register_permissions || {}),
          [module]: {
            ...modulePerms,
            [key]: next
          }
        }
      }
    })
  }

  const handleResetPassword = async () => {
    if (!profile.id) return
    setResetLoading(true)
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      })
      const data = await response.json()
      if (data.success) {
        setTempPassword(data.temporaryPassword)
        setShowResetConfirm(false)
      } else {
        alert(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Reset error:", error)
      alert("An unexpected error occurred.")
    } finally {
      setResetLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!formData) return
    setLoading(true)
    console.log("Saving User Permissions payload:", {
      id: formData.id,
      email: formData.email,
      permissions: formData.permissions,
      register_permissions: formData.register_permissions,
      pos_protocol: formData.permissions?.pos,
      inventory_protocol: formData.permissions?.inventory
    });
    await onSave(formData)
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl md:max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-50 shadow-2xl">
        <DialogHeader className="p-6 bg-[#001529] text-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/10 rounded-lg">
                <Shield className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight">Security & Identity Profile</DialogTitle>
                <DialogDescription className="text-white/50 text-[10px] uppercase font-bold tracking-widest">
                  Deep-dive permission management for {profile.full_name || profile.email}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <User className="h-3 w-3" /> Basic Identity Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Full Name</Label>
                <Input 
                  value={formData.full_name || ""} 
                  onChange={(e) => handleBasicInfoChange("full_name", e.target.value)}
                  disabled={!isAdmin}
                  className="h-9 text-xs font-bold bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Email Address</Label>
                <Input 
                  value={formData.email || ""} 
                  onChange={(e) => handleBasicInfoChange("email", e.target.value)}
                  disabled={!isAdmin}
                  className="h-9 text-xs font-bold bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <Input 
                    value={formData.phone || ""} 
                    onChange={(e) => handleBasicInfoChange("phone", e.target.value)}
                    disabled={!isAdmin}
                    className="h-9 pl-9 text-xs font-bold bg-white border-slate-200"
                    placeholder="+91 XXXX-XXXXXX"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Lock className="h-3 w-3" /> Register Access (Deep Dive)
            </h4>
            
            <Accordion className="w-full space-y-2">
              {Object.entries(MODULE_REGISTERS).map(([module, registers]) => {
                const isModuleEnabled = formData.permissions?.[module]
                if (!isModuleEnabled) return null

                return (
                  <AccordionItem key={module} value={module} className="border border-slate-200 bg-white rounded-lg overflow-hidden px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isModuleEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{module} PROTOCOL</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent keepMounted={true} className="pb-4 space-y-3">
                      {registers.map((reg) => {
                        const key = reg.toLowerCase().replace(/ /g, "_")
                        const level = formData.register_permissions?.[module]?.[key] || "view"
                        
                        return (
                          <div key={reg} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{reg}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">
                                Capability: {level === "edit" ? "Full Modification" : "Read-Only Observation"}
                              </p>
                            </div>
                            <div className="flex items-center gap-6">
                              <RadioGroup 
                                value={level} 
                                onValueChange={(val: string) => toggleRegisterLevel(module, reg, val as 'view' | 'edit')}
                                disabled={!isAdmin}
                                className="flex items-center gap-4"
                              >
                                  <div className="flex items-center gap-1.5">
                                    <RadioGroupItem value="view" id={`${reg}-view`} className="text-amber-500 border-amber-200 focus:ring-amber-500" />
                                    <Label htmlFor={`${reg}-view`} className="text-[9px] font-black uppercase text-amber-600 cursor-pointer">View Only</Label>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <RadioGroupItem value="edit" id={`${reg}-edit`} className="text-emerald-500 border-emerald-200 focus:ring-emerald-500" />
                                    <Label htmlFor={`${reg}-edit`} className="text-[9px] font-black uppercase text-emerald-600 cursor-pointer">Full Access</Label>
                                  </div>
                                </RadioGroup>
                            </div>
                          </div>
                        )
                      })}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          <hr className="border-slate-200" />

          {/* Security & Danger Zone */}
          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" /> Security & Risk Management
            </h4>
            
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 space-y-4">
              {!tempPassword ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Administrative Password Reset</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-tight max-w-[300px]">
                      Generate a temporary password. The user will be forced to update it on their next successful login.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    className="h-8 text-[9px] font-black uppercase tracking-widest px-4 shadow-sm"
                    disabled={!isAdmin || resetLoading}
                  >
                    Reset Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-emerald-700 uppercase">New Temporary Password Generated</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase italic">Limited Time Access</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border-2 border-emerald-200 rounded-lg h-12 flex items-center px-4 font-mono text-lg font-black tracking-widest text-emerald-600 shadow-inner">
                      {tempPassword}
                    </div>
                    <Button 
                      onClick={copyToClipboard}
                      className={cn(
                        "w-12 h-12 rounded-lg transition-all duration-300",
                        copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#001529] hover:bg-slate-800"
                      )}
                    >
                      {copied ? <Check className="h-5 w-5 text-white" /> : <Copy className="h-5 w-5 text-white" />}
                    </Button>
                  </div>
                  <div className="p-3 bg-white/50 rounded-lg border border-emerald-100">
                    <p className="text-[9px] font-bold text-slate-600 uppercase leading-snug">
                      <span className="text-emerald-600">IMPORTANT:</span> Share this password securely with the user. They will be prompted to create a new permanent password immediately after signing in.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Mini-Modal for Reset */}
        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent className="max-w-[400px] p-6">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase text-slate-900">Confirm Password Reset</DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500 leading-relaxed pt-2">
                Are you sure you want to reset the password for <span className="font-black text-slate-900">{profile.full_name || profile.email}</span>?
                <br /><br />
                A temporary password will be generated (Format: <span className="font-mono font-bold">ETHAN-XXXX</span>). This action will bypass all current authentication sessions for this user.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)} className="text-[10px] font-bold uppercase h-8 px-4">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-[10px] font-black uppercase h-8 px-6 shadow-md"
              >
                {resetLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Confirm Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter className="mt-4 flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-400 uppercase max-w-[200px]">
              * Permission changes take effect immediately in the global security layer.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-6 text-[10px] font-bold uppercase tracking-widest">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="min-w-[180px] h-9 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center transition-all"
                disabled={loading || !isAdmin}
              >
                {loading ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Saving...</>
                ) : (
                  "Save Identity Controls"
                )}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
