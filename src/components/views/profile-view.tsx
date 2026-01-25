'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ArrowRight, Lock, Shield, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'

interface ProfileViewProps {
  setCurrentView: (view: any) => void
}

interface UserOrganization {
  id: string
  name: string
  logo?: string
  role: string
}

// Helper function to format role display
const formatRoleDisplay = (role: string): string => {
  switch (role) {
    case 'Admin':
      return 'Organization Administrator'
    case 'OrgAdmin':
      return 'Organization Administrator'
    case 'Member':
      return 'Member'
    default:
      return role
  }
}

// Helper function to format system role display
const formatSystemRoleDisplay = (role: string): string => {
  switch (role) {
    case 'Admin':
      return 'System Administrator'
    case 'OrgAdmin':
      return 'Organization Administrator'
    case 'Student':
      return 'Student'
    default:
      return role
  }
}

export default function ProfileView({ setCurrentView }: ProfileViewProps) {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const currentOrgId = useAppStore((state) => state.currentOrgId)
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState<UserOrganization[]>([])
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    major: user?.major || '',
  })

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loadingPassword, setLoadingPassword] = useState(false)

  useEffect(() => {
    loadUserOrganizations()
  }, [user])

  const loadUserOrganizations = async () => {
    // Don't fetch if user is not logged in
    if (!user?.id) {
      setOrgs([])
      return
    }

    try {
      const response = await fetch('/api/organizations')
      const data = await response.json()

      const userOrgs: UserOrganization[] = []

      for (const org of data.organizations) {
        const membersRes = await fetch(`/api/members?orgId=${org.id}`)
        const membersData = await membersRes.json()

        const membership = membersData.members?.find((m: any) => m.userId === user?.id)
        if (membership) {
          userOrgs.push({
            id: org.id,
            name: org.name,
            logo: org.logo,
            role: membership.role,
          })
        }
      }

      setOrgs(userOrgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ...formData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        updateUser(data.user)
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update profile',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!passwordForm.currentPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your current password',
      })
      return
    }

    if (!passwordForm.newPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your new password',
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New password must be at least 6 characters',
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New passwords do not match',
      })
      return
    }

    setLoadingPassword(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        updateUser(data.user)
        // Reset password form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })

        toast({
          title: 'Success',
          description: 'Password updated successfully',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update password',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      })
    } finally {
      setLoadingPassword(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              avatar: reader.result,
            }),
          })

          const data = await response.json()
          if (response.ok) {
            updateUser(data.user)
            toast({
              title: 'Success',
              description: 'Avatar updated',
            })
          }
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update avatar',
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-red-50/30 to-rose-50/30 py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setCurrentView(currentOrgId ? 'org-hub' : 'dashboard')}
          className="mb-2 hover:bg-gray-100/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {currentOrgId ? 'Organization' : 'Dashboard'}
        </Button>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-purple-500/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-rose-100 to-red-100 text-xl sm:text-2xl">
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-rose-700 to-red-700 rounded-full flex items-center justify-center cursor-pointer hover:from-rose-800 hover:to-red-800 transition-colors"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold">{user?.name}</h2>
                <Badge variant="secondary" className="mt-1 text-xs sm:text-sm">
                  {formatSystemRoleDisplay(user?.role || '')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-indigo-500/10">
          <CardHeader className="bg-gradient-to-r from-red-500/10 to-rose-500/10 pb-4 border-b border-red-100">
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Read-only)</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted h-11"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="major">Department / Major</Label>
                  <Input
                    id="major"
                    placeholder="e.g. Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-purple-500/10">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 to-red-500/10 pb-4 border-b border-rose-100">
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-transparent">My Organizations</CardTitle>
            <CardDescription>Organizations you are a member of</CardDescription>
          </CardHeader>
          <CardContent>
            {orgs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 sm:py-12">
                You haven't joined any organizations yet
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {orgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-white to-rose-50/30 rounded-xl border border-rose-200/60 hover:border-rose-400 hover:shadow-lg hover:shadow-purple-500/15 transition-all cursor-pointer"
                  >
                    <Avatar>
                      <AvatarImage src={org.logo} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-100 to-red-100">
                        {org.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate text-gray-800">{org.name}</p>
                      <Badge className="text-xs mt-1 inline-block bg-purple-100 text-rose-700 border-rose-300">
                        {formatRoleDisplay(org.role)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-purple-500/10">
          <CardHeader className="bg-gradient-to-r from-red-500/10 to-rose-500/10 pb-4 border-b border-red-100">
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password (min. 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loadingPassword}>
                {loadingPassword ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 0 018-8 0 011.663-6.915 16.9-11.052l.157-11.663a8 8 0 01-1.523-2.82 1.819-7.932 7.932-3.724 3.724-6.915 2.82 1.819-6.915 16.9z" />
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Update Password
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
