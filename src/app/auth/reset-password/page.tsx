"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      // 1. Check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      
      // 2. If no session, wait a bit for Supabase to process URL hash (implicit flow)
      if (!session) {
        // Check if the current URL has an access token or recovery type in hash
        const hash = window.location.hash
        const isRecovery = hash.includes('type=recovery') || hash.includes('access_token=')
        
        if (isRecovery) {
          // Wait briefly for SDK to parse hash
          await new Promise(resolve => setTimeout(resolve, 1500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession) {
            router.push("/login")
          }
        } else {
          router.push("/login")
        }
      }
      setIsVerifying(false)
    }
    checkSession()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Update Auth Password & clear metadata flag
      const { error: resetError } = await supabase.auth.updateUser({ 
        password: password,
        data: { requires_password_change: false }
      })

      if (resetError) throw resetError

      // 2. Fetch User to update profile flag
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('id', user.id)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#001529] font-geist">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#7FD1E3]" />
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Validating Session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#001529] font-geist p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-[400px] relative z-10">
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7FD1E3] to-transparent opacity-50" />
          
          <CardHeader className="pt-8 px-8 pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-2xl bg-[#7FD1E3]/10 flex items-center justify-center border border-[#7FD1E3]/20 text-[#7FD1E3]">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-xl font-black text-white uppercase tracking-tight text-center">Security Protocol Update</CardTitle>
            <CardDescription className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] text-center mt-2">
              Finalize access credentials for secure session initialization.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-4">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-white text-lg font-bold uppercase tracking-tight">Identity Verified</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Password sync complete. Initializing main operational dashboard.
                </p>
                <div className="flex justify-center pt-2">
                   <Loader2 className="h-5 w-5 animate-spin text-[#7FD1E3]/40" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-[10px] font-bold uppercase tracking-tight">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-[10px] uppercase tracking-widest font-black ml-1">New Secure Password</Label>
                    <div className="relative group">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required 
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 px-4 pr-12 focus:bg-white/10 focus:border-[#7FD1E3]/50 transition-all rounded-xl"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#7FD1E3] transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/60 text-[10px] uppercase tracking-widest font-black ml-1">Confirm Protocol</Label>
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required 
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 px-4 focus:bg-white/10 focus:border-[#7FD1E3]/50 transition-all rounded-xl"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#00AEEF] hover:bg-[#0096cc] text-white font-black h-12 rounded-xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Verify & Set Credentials
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
