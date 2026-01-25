'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import LandingView from '@/components/views/landing-view'
import LoginView from '@/components/views/login-view'
import RegisterView from '@/components/views/register-view'
import DashboardView from '@/components/views/dashboard-view'
import AdminDashboardView from '@/components/views/admin-dashboard-view'
import ProfileView from '@/components/views/profile-view'
import OrgHubView from '@/components/views/org-hub-view'
import MaintenanceView from '@/components/views/maintenance-view'
import Navbar from '@/components/layout/navbar'

type ViewType = 'landing' | 'login' | 'register' | 'dashboard' | 'admin-dashboard' | 'profile' | 'org-hub'

interface Settings {
  status: string
  registration: string
  announcement: string
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const userSelector = useAuthStore((state) => state.user)

  const [currentView, setCurrentView] = useState<ViewType>('landing')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  // Poll settings every 5 seconds to detect changes made in other tabs/views
  useEffect(() => {
    const interval = setInterval(() => {
      loadSettings()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Auth redirect logic - redirect authenticated users away from auth pages
  useEffect(() => {
    if (isAuthenticated && (currentView === 'landing' || currentView === 'login' || currentView === 'register')) {
      console.log('User authenticated, redirecting from auth page to dashboard')
      setCurrentView('dashboard')
    } else if (!isAuthenticated && currentView !== 'landing' && currentView !== 'login' && currentView !== 'register') {
      console.log('User not authenticated, redirecting to landing')
      setCurrentView('landing')
    }
  }, [isAuthenticated, currentView])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  const renderView = () => {
    // Allow login, register, and landing pages to be accessible even during maintenance
    const isAuthPage = ['landing', 'login', 'register'].includes(currentView)
    const isAdmin = userSelector?.role === 'Admin'

    // Check if maintenance mode is on and block access to protected views
    if (settings?.status === 'maintenance' && !isAuthPage) {
      // Non-admin users are blocked
      if (!isAdmin) {
        return <MaintenanceView announcement={settings.announcement} />
      }

      // Admin users can only access admin dashboard during maintenance
      if (currentView !== 'admin-dashboard') {
        return <MaintenanceView announcement={settings.announcement} />
      }
    }

    switch (currentView) {
      case 'landing':
        return <LandingView setCurrentView={setCurrentView as any} />
      case 'login':
        return <LoginView setCurrentView={setCurrentView as any} />
      case 'register':
        return <RegisterView setCurrentView={setCurrentView as any} />
      case 'dashboard':
        return <DashboardView setCurrentView={setCurrentView as any} />
      case 'admin-dashboard':
        return <AdminDashboardView setCurrentView={setCurrentView as any} />
      case 'profile':
        return <ProfileView setCurrentView={setCurrentView as any} />
      case 'org-hub':
        return <OrgHubView setCurrentView={setCurrentView as any} />
      default:
        return <LandingView setCurrentView={setCurrentView as any} />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-screen max-w-screen">
      {isAuthenticated && (
        <Navbar
          user={userSelector}
          onLogout={logout}
          setCurrentView={setCurrentView}
        />
      )}
      <main className="flex-1 w-full overflow-x-hidden">
        {loadingSettings ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : (
          renderView()
        )}
      </main>
    </div>
  )
}
