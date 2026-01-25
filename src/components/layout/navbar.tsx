'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { GraduationCap, Menu, Settings, UserCircle, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

interface NavbarProps {
  user: any
  onLogout: () => void
  setCurrentView: (view: any) => void
}

export default function Navbar({ user, onLogout, setCurrentView }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const clearAppStore = useAppStore((state) => state.clear)

  const navItems = [
    ...(user?.role === 'Admin'
      ? [{ label: 'System Admin', action: () => setCurrentView('admin-dashboard'), icon: Settings }]
      : []),
    { label: 'Profile', action: () => setCurrentView('profile'), icon: UserCircle },
  ]

  const handleNavClick = (action: () => void) => {
    action()
    setMobileMenuOpen(false)
  }

  const handleLogout = () => {
    // Clear app store state (currentOrgId) before logging out
    clearAppStore()
    onLogout()
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-full overflow-hidden">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer flex-shrink-0"
          onClick={() => handleNavClick(() => setCurrentView('dashboard'))}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:block flex-shrink-0">UniOrg Monitor</span>
          <span className="font-bold text-sm sm:hidden flex-shrink-0">UniOrg</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              onClick={item.action}
              className="h-10 flex-shrink-0"
            >
              {item.icon && <item.icon className="w-4 h-4 mr-2" />}
              {item.label}
            </Button>
          ))}

          <div className="flex items-center gap-2 ml-2 lg:ml-4 flex-shrink-0">
            <span className="text-sm font-medium hidden lg:block truncate max-w-[150px]">
              {user?.name}
            </span>
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="text-xs sm:text-sm">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <Button variant="outline" onClick={handleLogout} className="h-10 flex-shrink-0">
            <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Log Out</span>
            <span className="sm:hidden">Logout</span>
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} className="md:hidden flex-shrink-0">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 flex-shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <SheetHeader className="mb-6">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-2">
              {/* User Info */}
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-sm">
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick(() => setCurrentView('dashboard'))}
                  className="justify-start h-12"
                >
                  Dashboard
                </Button>
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    variant="ghost"
                    onClick={() => handleNavClick(item.action)}
                    className="justify-start h-12"
                  >
                    {item.icon && <item.icon className="w-4 h-4 mr-3" />}
                    {item.label}
                  </Button>
                ))}
              </div>

              {/* Logout */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full h-12"
                >
                  Log Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
