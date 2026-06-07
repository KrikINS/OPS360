"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBranding } from "@/providers/GlobalBrandingProvider"

type AnimationStage = "loading" | "intro" | "form"

const BrandIdentity = ({ stage }: { stage: AnimationStage }) => {
  const { companyName, logoUrl } = useBranding()
  return (
    <div className={cn(
      "flex flex-col items-center transition-all duration-1000 ease-in-out",
      stage === "loading" && "opacity-0",
      stage === "intro" && "scale-100 mb-0 opacity-100",
      stage === "form" && "-mb-2 scale-[0.75] opacity-100"
    )}>
      <div className={cn(
        "transition-all duration-1000 ease-in-out relative",
        stage !== "loading" && stage !== "intro" ? "opacity-100" : "animate-in fade-in zoom-in duration-1000"
      )}>
        <Image 
          src={logoUrl || "/ethan-logo-final.png"} 
          alt={`${companyName} Logo`} 
          width={320} 
          height={320} 
          priority 
          sizes="(max-width: 768px) 100vw, 320px"
          style={{ width: 'auto', height: 'auto' }}
          className={cn(
            "drop-shadow-[0_0_50px_rgba(127,209,227,0.25)] bg-transparent object-contain transition-all duration-1000"
          )}
          unoptimized
        />
      </div>
      <div className={cn(
        "text-center space-y-2 transition-all duration-1000",
        "mt-6"
      )}>
        <div className="relative inline-block group">
          <h1 className={cn(
            "font-bold uppercase font-[family-name:var(--font-outfit)] transition-all duration-1000",
            stage === "intro" && "text-5xl text-white/60 tracking-normal",
            stage === "form" && "text-3xl text-white tracking-normal"
          )}>
            {companyName}
          </h1>
          <div className={cn(
            "absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7fd1e3] to-transparent shadow-[0_0_10px_rgba(127,209,227,0.5)] transition-all duration-1000",
            stage === "loading" ? "w-0 opacity-0" : "w-full opacity-100"
          )} />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-[#001529]" />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const passwordChanged = searchParams.get('passwordChanged')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [stage, setStage] = useState<AnimationStage>("loading")
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Set progress width via ref to avoid inline style lint issues
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${progress}%`
    }
  }, [progress])

  // 1. Loading Step
  useEffect(() => {
    if (stage !== "loading") return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setStage("intro"), 400)
          return 100
        }
        return prev + 4
      })
    }, 40)
    return () => clearInterval(interval)
  }, [stage])

  // 2. Intro Step -> Trigger Form after delay
  useEffect(() => {
    if (stage === "intro") {
      const timer = setTimeout(() => {
        setStage("form")
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [stage])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setErrorMessage(result.error)
        setLoading(false)
      } else if (result?.ok) {
        const session = await getSession()
        if (session?.user?.forcePasswordChange) {
          router.push('/change-password')
        } else {
          router.push('/launchpad')
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred")
      setLoading(false)
    }
  }

  if (stage === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#001529] font-geist">
        <div className="w-64 space-y-4">
          <div className="flex flex-col items-center gap-4 mb-2">
            <h2 className="text-white/30 text-[10px] font-semibold uppercase tracking-[0.4em]">Initializing</h2>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              ref={progressRef}
              className="h-full bg-[#00AEEF] transition-all duration-300 ease-out" 
            />
          </div>
          <p className="text-[#7FD1E3]/40 text-[9px] font-mono text-center tracking-widest uppercase">{progress}% SECURE LINK ESTABLISHED</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#001529] font-geist relative overflow-hidden p-6">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />

      {/* Brand Identity - Moves based on stage */}
      <div className={cn(
        "transition-all duration-1000 ease-in-out flex flex-col items-center",
        stage === "intro" ? "translate-y-0" : "flex-shrink-0"
      )}>
        <BrandIdentity stage={stage} />
      </div>

      {/* Login Card - Slides up */}
      <div className={cn(
        "w-full max-w-[360px] transition-all duration-1000 ease-out",
        stage === "form" ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-20 scale-95 pointer-events-none absolute"
      )}>
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7FD1E3] to-transparent opacity-50" />
          <CardContent className="p-8">
            <h3 className="text-white/90 text-center font-semibold mb-6">Staff Authentication</h3>
            
            {passwordChanged === 'true' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Password changed successfully. Please log in with your new password.
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg mb-6 border border-red-500/20 text-center animate-in shake-in duration-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60 text-[11px] uppercase tracking-wider font-bold ml-1">Work Email</Label>
                <div className="relative group">
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    autoComplete="off" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 px-4 focus:bg-white/10 focus:border-[#7FD1E3]/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 bg-[#7FD1E3]/5 rounded-xl opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/60 text-[11px] uppercase tracking-wider font-bold ml-1">Password</Label>
                <div className="relative group">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    autoComplete="current-password" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 px-4 pr-12 focus:bg-white/10 focus:border-[#7FD1E3]/50 transition-all rounded-xl"
                  />
                  <button 
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#7FD1E3] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute inset-0 bg-[#7FD1E3]/5 rounded-xl opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <a href="/login/forgot-password" className="text-[11px] text-[#7FD1E3]/70 hover:text-[#7FD1E3] font-semibold transition-colors uppercase tracking-widest">
                  Forgot Password?
                </a>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#002a52] hover:bg-[#003a6e] text-white font-bold h-12 rounded-xl transition-all shadow-lg border border-white/5 active:scale-[0.98] mt-2 relative overflow-hidden group"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <ShieldCheck size={18} />
                      Log In to Secure Portal
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Developer Watermark */}
      <div className="absolute bottom-6 right-8 text-center pointer-events-none select-none animate-in fade-in slide-in-from-right-4 duration-1000">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Powered By</p>
        <div className="flex items-center justify-center gap-1.5">
          <Image src="/AppTerra .PNG" alt="AppTerra" width={120} height={40} className="object-contain opacity-60" style={{ mixBlendMode: "screen" }} unoptimized />
        </div>
      </div>
      <style jsx global>{`
        @keyframes shake-in {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .shake-in {
          animation: shake-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
