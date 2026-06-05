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
import { Switch } from "@/components/ui/switch"
import { Loader2, Shield, User, Lock, AlertTriangle, Copy, Check, Phone, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Profile } from "@/app/admin/users/page"
import { setPosPin } from "@/app/actions/admin"

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
  
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [pinValue, setPinValue] = useState("")
  const [pinLoading, setPinLoading] = useState(false)
  const [hasPosPin, setHasPosPin] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const isAdmin = currentUserRole === "Admin/Owner" || currentUserRole === "SUPER_ADMIN"
  const roleName = (formData?.role || "").toLowerCase()
  const isManagerRole = ['super_admin', 'admin/owner', 'admin', 'manager', 'branch manager'].includes(roleName)

  useEffect(() => {
    if (profile && open) {
      setHasPosPin(!!profile.has_pos_pin)
      setIsChangingPin(false)
      setPinValue("")
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

  const toggleModulePermission = (module: string, checked: boolean) => {
    setFormData((prev) => {
      if (!prev) return null
      return {
        ...prev,
        permissions: {
          ...(prev.permissions || {}),
          [module]: checked
        }
      }
    })
  }

  const toggleRegisterLevel = (module: string, register: string, next: 'view' | 'edit' | 'none') => {
    const key = register.toLowerCase().replace(/ /g, "_")
    
    setFormData((prev) => {
      if (!prev) return null
      
      const currentRegisters = prev.register_permissions || {}
      const modulePerms = { 
        ...(currentRegisters[module] || {}),
        [key]: next 
      }
      
      return {
        ...prev,
        register_permissions: {
          ...currentRegisters,
          [module]: modulePerms
        }
      } as Profile
    })
  }

  const handleSavePin = async () => {
    if (!profile.id || pinValue.length !== 4) return
    setPinLoading(true)
    const result = await setPosPin(profile.id, pinValue)
    if (result.success) {
      setHasPosPin(true)
      setIsChangingPin(false)
      setToast({ message: "POS PIN updated", type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast({ message: result.error || "Failed to update PIN", type: 'error' })
      setTimeout(() => setToast(null), 3000)
    }
    setPinLoading(false)
  }

  const handleRemovePin = async () => {
    if (!profile.id) return
    if (!confirm("Remove this manager's POS PIN? They will not be able to approve discounts.")) return
    setPinLoading(true)
    const result = await setPosPin(profile.id, null)
    if (result.success) {
      setHasPosPin(false)
      setIsChangingPin(false)
      setToast({ message: "POS PIN removed", type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast({ message: result.error || "Failed to remove PIN", type: 'error' })
      setTimeout(() => setToast(null), 3000)
    }
    setPinLoading(false)
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
        setToast({ message: data.error || "Failed to reset password", type: 'error' })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error("Reset error:", error)
      setToast({ message: "An unexpected error occurred.", type: 'error' })
      setTimeout(() => setToast(null), 3000)
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

                return (
                  <AccordionItem key={module} value={module} className="border border-slate-200 bg-white rounded-lg overflow-hidden px-4">
                    <div className="flex items-center justify-between py-1 pr-1">
                      <AccordionTrigger className="hover:no-underline py-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isModuleEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{module} PROTOCOL</span>
                        </div>
                      </AccordionTrigger>
                      <div className="flex items-center gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[8px] font-black uppercase text-slate-400">STATUS: {isModuleEnabled ? "ACTIVE" : "INACTIVE"}</span>
                        <Switch 
                          checked={isModuleEnabled || false} 
                          onCheckedChange={(checked) => toggleModulePermission(module, checked)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                    <AccordionContent keepMounted={true} className="pb-4 space-y-3">
                      {!isModuleEnabled && (
                        <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Activate this protocol for deep-dive access controls</p>
                        </div>
                      )}
                      {isModuleEnabled && registers.map((reg) => {
                        const key = reg.toLowerCase().replace(/ /g, "_")
                        const val = formData.register_permissions?.[module]?.[key]
                        const level = val || "none"
                        
                        return (
                          <div key={reg} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{reg}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">
                                Capability: {level === "edit" ? "Full Modification" : (level === "view" ? "Read-Only Observation" : "No Access")}
                              </p>
                            </div>
                              <RadioGroup 
                                value={level} 
                                onValueChange={(val: string) => toggleRegisterLevel(module, reg, val as 'view' | 'edit' | 'none')}
                                disabled={!isAdmin}
                                className="flex items-center gap-4 py-1"
                              >
                                    <RadioGroupItem value="none" id={`${reg}-none`} className="text-slate-500 border-slate-200 focus:ring-slate-500" />
                                    <Label htmlFor={`${reg}-none`} className="text-[9px] font-black uppercase text-slate-500 cursor-pointer pr-2">None</Label>

                                    <RadioGroupItem value="view" id={`${reg}-view`} className="text-amber-500 border-amber-200 focus:ring-amber-500" />
                                    <Label htmlFor={`${reg}-view`} className="text-[9px] font-black uppercase text-amber-600 cursor-pointer pr-2">View Only</Label>

                                    <RadioGroupItem value="edit" id={`${reg}-edit`} className="text-emerald-500 border-emerald-200 focus:ring-emerald-500" />
                                    <Label htmlFor={`${reg}-edit`} className="text-[9px] font-black uppercase text-emerald-600 cursor-pointer">Full Access</Label>
                              </RadioGroup>
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
            
            {isManagerRole && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">POS Approval PIN</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-tight">
                      Required for discount approvals at POS
                    </p>
                  </div>
                </div>

                {hasPosPin && !isChangingPin ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl tracking-[0.3em] font-black text-slate-700 mt-1">●●●●</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsChangingPin(true)} className="h-7 text-[9px] font-bold uppercase">Change PIN</Button>
                      <Button variant="destructive" size="sm" onClick={handleRemovePin} disabled={pinLoading} className="h-7 text-[9px] font-bold uppercase">Remove PIN</Button>
                    </div>
                  </div>
                ) : (!hasPosPin && !isChangingPin) ? (
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPin(true)} className="w-full text-[10px] font-bold uppercase border-slate-300 border-dashed">
                    Set PIN
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input 
                      type="password" 
                      maxLength={4} 
                      pattern="\d*"
                      value={pinValue}
                      onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
                      className="w-24 text-center tracking-[0.5em] font-black text-lg"
                      placeholder="XXXX"
                    />
                    <Button onClick={handleSavePin} disabled={pinLoading || pinValue.length !== 4} className="h-10 text-[10px] font-bold uppercase">
                      {pinLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setIsChangingPin(false); setPinValue(""); }} className="h-10 text-[10px] font-bold uppercase">Cancel</Button>
                  </div>
                )}
              </div>
            )}
            
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

      {/* Toast Notification Container */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-500 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-md transition-all",
          toast.type === 'success' ? "bg-emerald-500/90 border-emerald-400/50 text-white" : "bg-rose-500/90 border-rose-400/50 text-white"
        )}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 animate-bounce" />
          ) : (
            <XCircle className="h-5 w-5 animate-pulse" />
          )}
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest opacity-70">
              {toast.type === 'success' ? "System Success" : "Protocol Deviation"}
            </span>
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </div>
          <button 
            className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => setToast(null)}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </Dialog>
  )
}
