import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Trash2, Eye } from 'lucide-react'
import ImageUpload from '@/components/ui/image-upload'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'

interface User {
  id: string
  name: string
  email: string
  role: string
  managedOrgs: string // Comma-separated list of organization IDs
  memberships?: Array<{ // Organizations this user is a member of
    id: string
    name: string
    role: string
  }>
}

interface Organization {
  id: string
  name: string
  description: string
  logo?: string
}

export default function AdminDashboardView({ setCurrentView }: { setCurrentView: (view: any) => void }) {
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const setCurrentOrgId = useAppStore((state) => state.setCurrentOrgId)

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [settings, setSettings] = useState({
    status: 'active',
    registration: 'open',
    announcement: '',
  })
  const [orgSelectDialog, setOrgSelectDialog] = useState<{ open: boolean; userId: string; userName: string; selectedOrgs: string[] } | null>(null)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [newOrg, setNewOrg] = useState({ name: '', description: '', mission: '', logo: '', cover: '' })
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{ open: boolean; userId: string; userName: string; newRole: string; orgId?: string } | null>(null)
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ open: boolean; userId: string; userName: string } | null>(null)
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState<{ open: boolean; orgId: string; orgName: string } | null>(null)

  const filteredUsers = (users || []).filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [orgsRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/users'),
        fetch('/api/settings'),
      ])
      const orgsData = await orgsRes.json()
      const usersData = await usersRes.json()
      const settingsData = await settingsRes.json()

      setOrganizations(orgsData.organizations || [])
      setUsers(usersData.users || [])
      if (settingsData.settings) {
        setSettings(settingsData.settings)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data',
      })
      // Set empty arrays on error to prevent undefined issues
      setOrganizations([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string, orgId?: string) => {
    // Show confirmation dialog for role changes
    const currentUser = (users || []).find(u => u.id === userId)
    setRoleChangeConfirm({
      open: true,
      userId,
      userName: currentUser?.name || 'this user',
      newRole,
      orgId,
    })
  }

  const confirmRoleChange = async () => {
    if (!roleChangeConfirm) return

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleChangeConfirm.userId, role: roleChangeConfirm.newRole, orgId: roleChangeConfirm.orgId }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User role updated',
        })
        setRoleChangeConfirm(null)
        loadData()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update role',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update role',
      })
    }
  }

// Force rebuild 2
  const confirmDeleteUser = async () => {
    if (!deleteUserConfirm) return

    try {
      const response = await fetch(`/api/users?id=${deleteUserConfirm.userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        })
        setDeleteUserConfirm(null)
        loadData()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete user',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      })
    }
  }

  const handleDeleteOrgConfirm = async () => {
    if (!deleteOrgConfirm) return

    try {
      const response = await fetch(`/api/organizations?id=${deleteOrgConfirm.orgId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Organization deleted successfully',
        })
        setDeleteOrgConfirm(null)
        loadData()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete organization',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete organization',
      })
    }
  }

  const getManagedOrgNames = (userId: string) => {
    const currentUser = (users || []).find(u => u.id === userId)
    if (!currentUser || !currentUser.managedOrgs || typeof currentUser.managedOrgs !== 'string' || currentUser.managedOrgs.trim() === '') {
      return <span className="text-muted-foreground text-sm italic">No organizations</span>
    }
    // managedOrgs is a comma-separated string, split it into an array
    const orgIds = currentUser.managedOrgs.split(',').filter(id => id.trim() !== '')
    return orgIds.map((orgId, index) => {
      const org = (organizations || []).find(o => o.id === orgId.trim())
      return (
        <Badge key={index} variant="secondary" className="mr-1">
          {org?.name || 'Unknown Org'}
        </Badge>
      )
    })
  }

  const getMemberOrgNames = (user: User) => {
    if (!user.memberships || user.memberships.length === 0) {
      return <span className="text-muted-foreground text-sm italic">No memberships</span>
    }
    return user.memberships.map((membership, index) => (
      <Badge key={index} variant="outline" className="mr-1">
        {membership.name}
      </Badge>
    ))
  }

  // Check if current user manages a specific organization
  const isManagingOrg = (orgId: string) => {
    if (!user) return false
    if (user.role === 'Admin') return true
    if (user.role !== 'OrgAdmin') return false

    if (!user.managedOrgs || typeof user.managedOrgs !== 'string') return false

    const managedOrgIds = user.managedOrgs.split(',').filter(id => id.trim() !== '')
    return managedOrgIds.includes(orgId.trim())
  }

  // Handle viewing organization details (read-only or full access)
  const handleViewOrg = (orgId: string) => {
    setCurrentOrgId(orgId)
    setCurrentView('org-hub')
  }

  const handleOrgSelectSubmit = async () => {
    if (!orgSelectDialog) return

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orgSelectDialog.userId,
          role: 'OrgAdmin',
          orgId: orgSelectDialog.selectedOrgs.join(','),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User is now an Org Admin for selected organizations',
        })
        setOrgSelectDialog(null)
        loadData()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update user',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      })
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: e.target.name.value,
          description: e.target.description.value,
          mission: e.target.mission.value,
          logo: newOrg.logo,
          cover: newOrg.cover,
          creatorUserId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Organization created successfully',
        })
        setCreateOrgOpen(false)
        setNewOrg({ name: '', description: '', mission: '', logo: '', cover: '' })
        loadData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create organization',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      })
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        // Reload settings to get the updated values from server
        const settingsRes = await fetch('/api/settings')
        const settingsData = await settingsRes.json()
        if (settingsData.settings) {
          setSettings(settingsData.settings)
        }

        toast({
          title: 'Success',
          description: 'Settings saved successfully',
        })
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to save settings',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings',
      })
    }
  }

  return (
    <div className="container py-6 sm:py-8 px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">System Administration</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage users, organizations, and global settings
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48 sm:w-64" />
          <div className="h-32 sm:h-48 bg-muted rounded" />
        </div>
      ) : (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
                    <CardDescription>
                      View and manage user roles and permissions
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No users found matching "{searchQuery}"</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-sm sm:text-base">{u.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {u.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          {u.role === 'Student' && (
                            <div className="mt-2 flex flex-wrap gap-1 items-start">
                              <span className="text-xs text-muted-foreground mr-1">Member of:</span>
                              <div className="flex flex-wrap gap-1">
                                {getMemberOrgNames(u)}
                                {u.memberships && u.memberships.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOrgSelectDialog({
                                        open: true,
                                        userId: u.id,
                                        userName: u.name,
                                        selectedOrgs: u.memberships.map((m) => m.id),
                                      })
                                    }}
                                  >
                                    Make OrgAdmin
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {(u.role === 'OrgAdmin' || u.role === 'Admin') && (
                            <div className="mt-2 flex flex-wrap gap-1 items-start">
                              <span className="text-xs text-muted-foreground mr-1">Managed Orgs:</span>
                              {getManagedOrgNames(u.id)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:items-center gap-2 w-full sm:w-auto">
                          {u.role !== 'Admin' && (
                            <Select
                              value={u.role}
                              onValueChange={(value) => {
                                if (value === 'OrgAdmin') {
                                  // Open dialog to select which organizations to manage
                                  setOrgSelectDialog({
                                    open: true,
                                    userId: u.id,
                                    userName: u.name,
                                    selectedOrgs: u.managedOrgs && typeof u.managedOrgs === 'string'
                                      ? u.managedOrgs.split(',').filter(id => id.trim() !== '')
                                      : [],
                                  })
                                } else {
                                  // For Student or Admin, update immediately
                                  handleChangeRole(u.id, value)
                                }
                              }}
                              className="w-[120px] sm:w-[140px] h-10"
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Student">Student</SelectItem>
                                <SelectItem value="OrgAdmin">Org Admin</SelectItem>
                                <SelectItem value="Admin">System Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {u.role !== 'Admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                const currentUser = (users || []).find(usr => usr.id === u.id)
                                setDeleteUserConfirm({
                                  open: true,
                                  userId: u.id,
                                  userName: currentUser?.name || 'this user',
                                })
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>
                      View and manage all organizations
                    </CardDescription>
                  </div>
                  <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} key="create-org">
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto h-11">Create Organization</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>
                          Fill in details to create a new organization
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateOrg} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={newOrg.name}
                            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newOrg.description}
                            onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="mission">Mission</Label>
                          <Input
                            id="mission"
                            value={newOrg.mission}
                            onChange={(e) => setNewOrg({ ...newOrg, mission: e.target.value })}
                            required
                          />
                        </div>
                        <ImageUpload
                          label="Logo"
                          onImageChange={(base64) => setNewOrg({ ...newOrg, logo: base64 || '' })}
                          className="mb-4"
                        />
                        <ImageUpload
                          label="Cover Image"
                          onImageChange={(base64) => setNewOrg({ ...newOrg, cover: base64 || '' })}
                          className="mb-4"
                        />
                        <Button type="submit" className="w-full h-11">
                          Create Organization
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">
                    {user?.role === 'Admin'
                      ? `Showing all ${organizations.length} organizations`
                      : `Showing all ${organizations.length} organizations (click to view details)`}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(organizations || []).map((org) => {
                    const canManage = isManagingOrg(org.id)
                    return (
                      <Card key={org.id} className={canManage ? '' : 'border-muted'}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                {org.name}
                                {!canManage && (
                                  <Badge variant="outline" className="text-xs">
                                    View Only
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="line-clamp-2 text-sm">
                                {org.description}
                              </CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewOrg(org.id)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setDeleteOrgConfirm({
                                      open: true,
                                      orgId: org.id,
                                      orgName: org.name,
                                    })
                                  }}
                                  title="Delete Organization"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure global platform settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">System Status</Label>
                  <Select
                    value={settings.status}
                    onValueChange={(value) => setSettings({ ...settings, status: value })}
                    >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Open for use)</SelectItem>
                      <SelectItem value="maintenance">Maintenance Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="registration">Registration</Label>
                  <Select
                    value={settings.registration}
                    onValueChange={(value) => setSettings({ ...settings, registration: value })}
                    >
                    <SelectTrigger id="registration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open to new students</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="announcement">Announcement Message</Label>
                  <Textarea
                    id="announcement"
                    value={settings.announcement}
                    onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                    placeholder="Message displayed to all users..."
                    rows={3}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <Button className="w-full sm:w-auto h-11" onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Organization Selection Dialog */}
      <Dialog open={!!orgSelectDialog} onOpenChange={(open) => setOrgSelectDialog(open ? null : undefined)} key="org-select">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Organizations</DialogTitle>
            <DialogDescription>
              Select organizations for <span className="font-semibold">{orgSelectDialog?.userName || 'this user'}</span> as Org Admin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              <Label>Available Organizations</Label>
              <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 space-y-2">
                {(organizations || []).map((org) => (
                  <label key={org.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={orgSelectDialog?.selectedOrgs?.includes(org.id) || false}
                      onChange={(e) => {
                        const checked = e.target.checked
                        const newSelected = checked
                          ? [...(orgSelectDialog?.selectedOrgs || []), org.id]
                          : (orgSelectDialog?.selectedOrgs || []).filter(id => id !== org.id)
                        setOrgSelectDialog({ ...orgSelectDialog, selectedOrgs: newSelected })
                        }}
                      className="w-5 h-5"
                    />
                    <span className="flex-1">{org.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOrgSelectDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={handleOrgSelectSubmit}>
                  Assign {orgSelectDialog?.selectedOrgs?.length || 0} Org{orgSelectDialog?.selectedOrgs?.length !== 1 ? 'izations' : 'ization'}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => setRoleChangeConfirm(open ? null : undefined)} key="role-change">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <span className="font-semibold">{roleChangeConfirm?.userName}</span>'s role to <span className="font-semibold">{roleChangeConfirm?.newRole}</span>?
            </AlertDialogDescription>
            {roleChangeConfirm?.newRole === 'OrgAdmin' && roleChangeConfirm?.orgId && (
              <p className="text-sm text-muted-foreground mt-2">
                This will make them an Org Admin of the selected organizations.
              </p>
            )}
            {roleChangeConfirm?.newRole === 'Student' && (
              <p className="text-sm text-destructive mt-2">
                This will remove all their administrative privileges and organization management access.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteUserConfirm} onOpenChange={(open) => setDeleteUserConfirm(open ? null : undefined)} key="delete-user">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm User Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteUserConfirm?.userName}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Organization Confirmation Dialog */}
      <AlertDialog open={!!deleteOrgConfirm} onOpenChange={(open) => setDeleteOrgConfirm(open ? null : undefined)} key="delete-org">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Organization Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteOrgConfirm?.orgName}</span>? This will also delete all activities, budgets, members, and feedback associated with this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrgConfirm} className="bg-destructive hover:bg-destructive/90">Delete Organization</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
