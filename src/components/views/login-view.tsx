'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { GraduationCap, Lock, Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react'

interface LoginViewProps {
  setCurrentView: (view: any) => void
}

export default function LoginView({ setCurrentView }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setAuth(data.user)
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to login',
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-red-50 via-rose-50/50 to-amber-50/50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-4 md:-right-10 w-96 h-96 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 -left-4 md:-left-10 w-96 h-96 bg-gradient-to-tr from-rose-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 py-8 sm:py-12 min-h-screen">
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom duration-500">
          {/* Logo and Title */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-rose-900 to-red-950 rounded-2xl blur-xl opacity-20" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-800 via-rose-900 to-red-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-900 via-rose-900 to-red-950 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h1>
              <p className="text-base text-slate-600">
                Sign in to access your organization dashboard
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-slate-200/60 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50/50 to-rose-50/50 border-b border-slate-100/50 pb-6">
              <CardTitle className="text-2xl font-bold text-slate-800">Login</CardTitle>
              <CardDescription className="text-slate-600">
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="h-12 pl-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
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
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-12 pl-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-red-800 via-rose-900 to-red-950 hover:from-red-900 hover:via-rose-950 hover:to-red-950 border-0 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 text-base font-semibold group"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 0 018-8 0 018-8 0 011.663-6.915 16.9-11.052l.157.11.663a8 8 0 01-1.523-2.82 1.819-7.932 7.932-3.724 3.724-6.915-2.82 1.819-6.915 16.9zm4.692 3.063a1 1 0 01-1.523-2.82-3.537-6.915l.802.802a8 8 0 011.663-6.915 16.9-11.052l-.157.11.663a8 8 0 011.663-6.915 16.9z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Sign In
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Demo Accounts */}
              <div className="mt-8 p-5 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 rounded-xl border border-amber-200/50 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-bold text-slate-800">Demo Accounts</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg border border-amber-200/30">
                    <span className="font-medium text-slate-700">System Administrator</span>
                    <span className="text-slate-600 font-mono text-xs">admin@uni.edu / admin123</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg border border-amber-200/30">
                    <span className="font-medium text-slate-700">Org Admin</span>
                    <span className="text-slate-600 font-mono text-xs">orgadmin@uni.edu / admin123</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg border border-amber-200/30">
                    <span className="font-medium text-slate-700">Student</span>
                    <span className="text-slate-600 font-mono text-xs">student@uni.edu / 123</span>
                  </div>
                </div>
              </div>

              {/* Register Link */}
              <div className="mt-6 text-center animate-in fade-in duration-500">
                <p className="text-slate-600 mb-2">
                  Don't have an account?
                </p>
                <Button
                  variant="ghost"
                  className="h-11 px-6 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold transition-colors"
                  onClick={() => setCurrentView('register')}
                >
                  Create Account
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
