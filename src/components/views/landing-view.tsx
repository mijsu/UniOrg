import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, Users, BarChart3, MessageSquare, ArrowRight, Sparkles } from 'lucide-react'

interface LandingViewProps {
  setCurrentView: (view: 'login' | 'register' | 'dashboard') => void
}

export default function LandingView({ setCurrentView }: LandingViewProps) {
  console.log('LandingView rendered')
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50/50 to-red-50/50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-4 md:-right-20 w-96 h-96 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 -left-4 md:-left-20 w-96 h-96 bg-gradient-to-tr from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 -left-20 w-64 h-64 bg-gradient-to-br from-rose-300/10 to-red-300/10 rounded-full blur-2xl" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-8 sm:py-12 min-h-screen">
        <div className="max-w-6xl mx-auto text-center w-full space-y-8 sm:space-y-12">
          {/* Logo Section */}
          <div className="flex justify-center mb-4 sm:mb-8 animate-in fade-in duration-700">
            <div className="relative group cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-900 to-rose-900 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-all duration-500" />
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-red-800 via-red-900 to-rose-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 group-hover:shadow-2xl shadow-red-500/50 transition-all duration-500 group-hover:scale-105">
                <GraduationCap className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom duration-700 delay-100">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-100 to-rose-100 border border-red-200/50 shadow-sm">
              <Sparkles className="w-4 h-4 text-red-700" />
              <span className="text-sm font-semibold bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
                University Organization Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold bg-gradient-to-r from-red-900 via-rose-900 to-red-950 bg-clip-text text-transparent leading-tight">
              Empowering Student
              <br />
              Organizations
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              A modern, unified platform for managing activities, budgets,
              <br className="hidden sm:inline" /> memberships, and member engagement.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in duration-700 delay-200">
            <Button
              size="lg"
              onClick={() => {
                console.log('Login button clicked')
                setCurrentView('login')
              }}
              className="w-full sm:w-auto h-12 sm:h-14 px-8 bg-gradient-to-r from-red-800 via-red-900 to-rose-900 hover:from-red-900 hover:via-rose-900 hover:to-red-950 border-0 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 text-base sm:text-lg font-semibold group"
            >
              Log In
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                console.log('Register button clicked')
                setCurrentView('register')
              }}
              className="w-full sm:w-auto h-12 sm:h-14 px-8 bg-white/80 backdrop-blur-sm border-2 border-amber-200 text-amber-800 hover:bg-white hover:border-amber-300 hover:text-amber-900 shadow-sm hover:shadow-lg transition-all duration-300 text-base sm:text-lg font-semibold"
            >
              Register
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 animate-in slide-in-from-bottom duration-700 delay-300">
            <Card className="group relative p-5 sm:p-7 bg-white/90 backdrop-blur-sm border-0 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-800 to-rose-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-800 relative">
                  Organization Management
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Create and manage student organizations with ease and professionalism
                </p>
              </div>
            </Card>

            <Card className="group relative p-5 sm:p-7 bg-white/90 backdrop-blur-sm border-0 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-800 to-red-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-800 relative">
                  Budget Tracking
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Monitor and manage organization budgets effectively with real-time insights
                </p>
              </div>
            </Card>

            <Card className="group relative p-5 sm:p-7 bg-white/90 backdrop-blur-sm border-0 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 hover:-translate-y-1 overflow-hidden sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-700 to-yellow-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-500">
                  <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-800 relative">
                  Member Engagement
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Track activities, events, and member feedback seamlessly
                </p>
              </div>
            </Card>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-in fade-in duration-700 delay-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50/60 backdrop-blur-sm border border-amber-200/50 text-xs sm:text-sm font-medium text-amber-800">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Secure Authentication
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50/60 backdrop-blur-sm border border-amber-200/50 text-xs sm:text-sm font-medium text-amber-800">
              <div className="w-2 h-2 rounded-full bg-amber-600" />
              Real-time Updates
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50/60 backdrop-blur-sm border border-amber-200/50 text-xs sm:text-sm font-medium text-amber-800">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              Modern Design
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
