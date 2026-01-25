'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { GraduationCap, User, Mail, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface RegisterViewProps {
  setCurrentView: (view: any) => void
}

export default function RegisterView({ setCurrentView }: RegisterViewProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setAuth(data.user)
        toast({
          title: 'Account created!',
          description: 'Welcome to UniOrg Monitor.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create account',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50/50 to-yellow-50/50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-4 md:-right-10 w-96 h-96 bg-gradient-to-bl from-rose-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-gradient-to-br from-red-300/10 to-amber-300/10 rounded-full blur-2xl" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 py-8 sm:py-12 min-h-screen">
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom duration-500">
          {/* Logo and Title */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-800 via-red-900 to-amber-900 rounded-2xl blur-xl opacity-20" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-rose-800 via-red-900 to-amber-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-500/30">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-rose-600" />
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-900 via-red-900 to-amber-900 bg-clip-text text-transparent">
                  Create Account
                </h1>
              </div>
              <p className="text-base text-slate-600">
                Join UniOrg Monitor to manage student organizations
              </p>
            </div>
          </div>

          {/* Register Card */}
          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-slate-200/60 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-50/50 to-amber-50/50 border-b border-slate-100/50 pb-6">
              <CardTitle className="text-2xl font-bold text-slate-800">Sign Up</CardTitle>
              <CardDescription className="text-slate-600">
                Fill in your details to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      className="h-12 pl-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-12 pl-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-12 pl-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-3 p-4 bg-gradient-to-br from-rose-50/50 to-amber-50/50 rounded-xl border border-rose-100/50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">By creating an account, you'll get:</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Organization Management</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Budget Tracking</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Activity Planning</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-rose-800 via-red-900 to-amber-900 hover:from-rose-900 hover:via-red-950 hover:to-amber-950 border-0 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all duration-300 text-base font-semibold group"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 0 018-8 0 018-8 0 011.663-6.915 16.9-11.052l.157.11.663a8 8 0 01-1.523-2.82 1.819-7.932 7.932-3.724 3.724-6.915-2.82 1.819-6.915 16.9zm4.692 3.063a1 1 0 01-1.523-2.82-3.537-6.915l.802.802a8 8 0 011.663-6.915 16.9-11.052l-.157.11.663a8 8 0 011.663-6.915 16.9z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Create Account
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center animate-in fade-in duration-500">
                <p className="text-slate-600 mb-2">
                  Already have an account?
                </p>
                <Button
                  variant="ghost"
                  className="h-11 px-6 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold transition-colors"
                  onClick={() => setCurrentView('login')}
                >
                  Sign In
                  <ArrowRight className="ml-2 w-4 h-4 inline" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
