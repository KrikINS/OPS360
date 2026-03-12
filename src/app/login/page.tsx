"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { login } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setErrorMessage(message)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await login(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001529]">
      <div className="w-full max-w-md p-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white p-1 rounded-lg">
              <Image src="/ethan-logo.png" alt="Ethan Logo" width={32} height={32} priority className="rounded-md" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Ops360 ERP</span>
          </div>
        </div>
        
        <Card className="shadow-2xl border-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Staff Portal Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the ERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="m.manager@ethan.in" autoComplete="off" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-primary hover:underline font-medium">
                    Forgot Password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" autoComplete="new-password" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#001529] hover:bg-[#002a52] text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
