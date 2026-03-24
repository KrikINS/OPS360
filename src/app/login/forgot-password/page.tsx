"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) throw resetError
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#001529] font-geist p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-[400px] relative z-10">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-[#7FD1E3]/60 hover:text-[#7FD1E3] text-xs font-bold uppercase tracking-widest mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Authentication
        </Link>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7FD1E3] to-transparent opacity-50" />
          <CardContent className="p-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-white text-xl font-bold uppercase tracking-tight">Email Dispatched</h3>
                <p className="text-white/60 text-sm">
                  We&apos;ve sent a recovery link to your inbox. Please follow the instructions to reset your secure access.
                </p>
                <div className="pt-4">
                  <Button 
                    variant="outline"
                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-widest text-xs h-10"
                    onClick={() => router.push("/login")}
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Recover Access</h3>
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                    A secure reset link will be transmitted to your registered corporate email.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg border border-red-500/20 text-center font-bold uppercase tracking-tighter">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/60 text-[10px] uppercase tracking-widest font-black ml-1">Identity Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#7FD1E3] transition-colors" />
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="identity@ethan.in" 
                        required 
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 pl-12 pr-4 focus:bg-white/10 focus:border-[#7FD1E3]/50 transition-all rounded-xl"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-[#00AEEF] hover:bg-[#0096cc] text-white font-black h-12 rounded-xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Issue Recovery Link"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
