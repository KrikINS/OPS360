"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { setActiveBranchAction } from "@/app/actions/branch"
import { useBranding } from "@/providers/GlobalBrandingProvider"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LogOut, Settings, Loader2, KeyRound, Check, Receipt, Plus } from "lucide-react"

type UserNavProps = {
  profile: {
    id: string
    full_name: string
    email: string
    role: string
    branch_id: string
    branch_name?: string
    all_branches?: Array<{
      id: string
      name: string
      is_primary: boolean
    }>
  }
}

export function UserNav({ profile }: UserNavProps) {
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [fullName, setFullName] = useState(profile.full_name || "")
  const [isSaving, setIsSaving] = useState(false)
  const [switchingBranchId, setSwitchingBranchId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [expAmount, setExpAmount]   = useState('')
  const [expAccount, setExpAccount] = useState('5070')
  const [expPayment, setExpPayment] = useState('1010')
  const [expDesc, setExpDesc]       = useState('')
  const [expError, setExpError]     = useState('')
  const [expSubmitting, setExpSubmitting] = useState(false)
  const [expSuccess, setExpSuccess] = useState(false)
  const { data: session } = useSession()
  const { supportEmail } = useBranding()

  const displayEmail = session?.user?.email || profile.email
  const displayName = session?.user?.name || profile.full_name || displayEmail.split("@")[0] || "User"
  const rawRole = session?.user?.role || profile.role || ""
  const displayRole = rawRole
    ? rawRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "User"

  const initials = displayName
    ? displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "US"

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg("")

    try {
      
      // Users are only permitted to explicitly update their own display name.
      // Roles, Emails, and Branch IDs are locked and managed strictly by Admins.
      const { error } = await import("@/app/actions/generics").then(m => m.updateData("profiles", {
          id: profile.id,
          full_name: fullName 
        }))

      if (error) throw error

      setIsEditDialogOpen(false)
      router.refresh()
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSwitchBranch = async (branchId: string) => {
    if (branchId === profile.branch_id) return
    setSwitchingBranchId(branchId)
    try {
      await setActiveBranchAction(branchId)
      
      // Force a hard navigation bypassing client-side router cache
      window.location.assign(window.location.pathname)
    } catch (err) {
      console.error("Failed to switch branch:", err)
      setErrorMsg("Failed to switch branch: " + (err as Error).message)
    } finally {
      // Small timeout to allow the browser assign to initiate before removing the spinner
      setTimeout(() => setSwitchingBranchId(null), 1000)
    }
  }

  const handleSubmitExpense = async () => {
    if (!expAmount || !expDesc.trim()) {
      setExpError('Amount and description are required')
      return
    }
    if (parseFloat(expAmount) <= 0) {
      setExpError('Amount must be greater than 0')
      return
    }
    setExpSubmitting(true)
    setExpError('')
    try {
      const { createExpenseRecord } = await import('@/actions/finance')
      const result = await createExpenseRecord({
        amount:         parseFloat(expAmount),
        expenseAccount: expAccount,
        paymentAccount: expPayment,
        description:    expDesc.trim(),
      })
      if (result.success) {
        setExpSuccess(true)
        setTimeout(() => {
          setIsExpenseDialogOpen(false)
          setExpAmount(''); setExpDesc(''); setExpAccount('5070')
          setExpPayment('1010'); setExpSuccess(false)
        }, 1500)
      } else {
        setExpError(result.error ?? 'Failed to submit expense')
      }
    } catch (err) {
      setExpError((err as Error).message)
    } finally {
      setExpSubmitting(false)
    }
  }

  const EXPENSE_ACCOUNTS = [
    { code: '5020', name: 'Freight & Logistics' },
    { code: '5030', name: 'Utilities' },
    { code: '5040', name: 'Rent' },
    { code: '5060', name: 'Marketing & Advertising' },
    { code: '5070', name: 'Miscellaneous Expense' },
  ]
  const PAYMENT_ACCOUNTS = [
    { code: '1010', name: 'Cash & Petty Cash' },
    { code: '1020', name: 'Bank Accounts' },
  ]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative h-10 w-10 flex items-center justify-center rounded-full bg-[#7FD1E3] hover:bg-[#6BC1D3] transition-colors outline-none focus:ring-2 focus:ring-[#7FD1E3]/50 focus:ring-offset-0 shadow-sm">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-transparent text-[#001529] font-bold">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuGroup>
            <div className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">Welcome, {displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-full">
                  {displayRole}
                </div>
              </div>
            </div>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <div className="px-2 py-1.5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Active Branch</span>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700 truncate">{profile.branch_name || "No Branch Assigned"}</span>
              </div>
            </div>
          </DropdownMenuGroup>
          
          {profile.all_branches && profile.all_branches.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1 block">Switch Location</span>
                  <div className="flex flex-col gap-1">
                    {profile.all_branches.map(branch => {
                      const isActive = branch.id === profile.branch_id
                      const isSwitching = switchingBranchId === branch.id

                      return (
                        <DropdownMenuItem
                          key={branch.id}
                          disabled={isActive || switchingBranchId !== null}
                          className={`flex items-center justify-between text-[11px] px-3 py-2.5 sm:px-2 sm:py-1.5 rounded transition-colors cursor-pointer ${
                            isActive ? 'bg-primary/5 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            handleSwitchBranch(branch.id)
                          }}
                        >
                          <span className="truncate max-w-[180px]">{branch.name}</span>
                          {isActive && <Check className="h-3 w-3" />}
                          {isSwitching && <Loader2 className="h-3 w-3 animate-spin" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </div>
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup className="font-bold text-[10px] uppercase tracking-wider">
            <DropdownMenuItem 
              className="cursor-pointer font-bold text-[10px] uppercase tracking-wider h-11 sm:h-9" 
              onClick={(e) => {
                e.preventDefault()
                setIsEditDialogOpen(true)
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Update Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer font-bold text-[10px] uppercase tracking-wider h-11 sm:h-9" 
              onClick={() => router.push("/auth/reset-password")}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer font-bold text-[10px] uppercase tracking-wider h-11 sm:h-9 text-amber-700 hover:text-amber-800 focus:text-amber-800"
              onClick={(e) => {
                e.preventDefault()
                setIsExpenseDialogOpen(true)
              }}
            >
              <Receipt className="mr-2 h-4 w-4" />
              <span>Submit Expense</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <form action={() => import("next-auth/react").then(m => m.signOut({ callbackUrl: "/login" }))}>
              <button
                type="button"
                onClick={() => import("next-auth/react").then(m => m.signOut({ callbackUrl: "/login" }))}
                className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-destructive focus:bg-destructive/10 outline-none transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </form>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle>Update Profile</DialogTitle>
              <DialogDescription>
                Modify your personal details. Security fields (Role, Branch) can only be changed by an Administrator.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Work Email</label>
                <Input value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Contact the master administrator ({supportEmail}) to change your designated email address.</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  id="name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
              {errorMsg && (
                <div className="text-sm text-destructive">{errorMsg}</div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseDialogOpen} onOpenChange={open => {
        setIsExpenseDialogOpen(open)
        if (!open) { setExpError(''); setExpSuccess(false) }
      }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-600" />
              Submit Expense
            </DialogTitle>
            <DialogDescription>
              Submit an expense for manager approval. It will be reviewed before posting to accounts.
            </DialogDescription>
          </DialogHeader>

          {expSuccess ? (
            <div className="py-8 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <Receipt className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="font-bold text-emerald-700">Expense Submitted!</p>
              <p className="text-sm text-slate-500">Your expense has been submitted for approval.</p>
            </div>
          ) : (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount (₹) *</label>
                  <Input
                    type="number" min="0.01" step="0.01"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment Source</label>
                  <select value={expPayment} onChange={e => setExpPayment(e.target.value)}
                    className="h-9 border rounded-lg px-3 text-sm bg-white w-full">
                    {PAYMENT_ACCOUNTS.map(a => (
                      <option key={a.code} value={a.code}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Expense Category *</label>
                <select value={expAccount} onChange={e => setExpAccount(e.target.value)}
                  className="h-9 border rounded-lg px-3 text-sm bg-white w-full">
                  {EXPENSE_ACCOUNTS.map(a => (
                    <option key={a.code} value={a.code}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Description *</label>
                <textarea
                  placeholder="Brief description of the expense..."
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  className="min-h-[80px] w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {expError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{expError}</p>
              )}
            </div>
          )}

          {!expSuccess && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitExpense}
                disabled={expSubmitting || !expAmount || !expDesc.trim()}
                className="bg-[#001529] hover:bg-[#002545] text-white"
              >
                {expSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                  : <><Plus className="mr-2 h-4 w-4" />Submit Expense</>
                }
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
