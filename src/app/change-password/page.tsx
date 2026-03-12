"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, ShieldAlert } from "lucide-react"
import Image from "next/image"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword]     = useState("")
  const [confirmPassword, setConfirm]     = useState("")
  const [showPw, setShowPw]               = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")
  const [success, setSuccess]             = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })

    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Clear the force_password_change flag
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id)
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push("/"), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001529] via-[#002a52] to-[#001529] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <Image src="/ethan-logo.png" alt="Ethan" width={44} height={44} className="object-contain" />
          </div>
          <div className="text-center">
            <h2 className="text-white font-semibold text-lg">Ethan Home Appliances</h2>
            <p className="text-[#7FD1E3] text-xs uppercase tracking-widest font-medium">Ops360 ERP</p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 bg-[#e8f9fc] rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="h-6 w-6 text-[#7FD1E3]" />
            </div>
            <CardTitle className="text-lg font-semibold">Change Your Password</CardTitle>
            <CardDescription className="text-sm">
              Your admin has required you to set a new password before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-[#5A9E78]" />
                <p className="font-medium text-foreground">Password updated!</p>
                <p className="text-sm text-muted-foreground">Redirecting to the dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input
                      required
                      type={showPw ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" title="Toggle password visibility">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    required
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#001529] hover:bg-[#002a52] text-white mt-2">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Set New Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
