"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/app/login/actions"
import { createClient } from "@/utils/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { LogOut, Settings, Loader2 } from "lucide-react"

type UserNavProps = {
  profile: {
    id: string
    full_name: string
    email: string
    role: string
    branch_id: string
    branch_name?: string
  }
}

export function UserNav({ profile }: UserNavProps) {
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [fullName, setFullName] = useState(profile.full_name || "")
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg("")

    try {
      const supabase = createClient()
      // Users are only permitted to explicitly update their own display name.
      // Roles, Emails, and Branch IDs are locked and managed strictly by Admins.
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id)

      if (error) throw error

      setIsEditDialogOpen(false)
      router.refresh()
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "US"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 border hover:bg-muted outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">Welcome, {profile.full_name}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-full">
                  {profile.role}
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="text-muted-foreground cursor-default flex justify-between">
              <span>Assigned Branch:</span>
              <span className="font-medium text-foreground">{profile.branch_name || profile.branch_id}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem 
              className="cursor-pointer" 
              onSelect={(e) => {
                e.preventDefault()
                setIsEditDialogOpen(true)
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Update Profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <form action={logout}>
              <button
                type="submit"
                className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
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
                <p className="text-xs text-muted-foreground">Contact IT to change your designated email address.</p>
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
    </>
  )
}
