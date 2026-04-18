import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Trash2, Eye, Plus, UserCheck, Edit, Mail, Loader2 } from 'lucide-react'
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
  membershipStatus?: 'Paid' | 'Pending'
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

interface AllowedStudent {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export default function AdminDashboardView({ setCurrentView }: { setCurrentView: (view: any) => void }) {
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const setCurrentOrgId = useAppStore((state) => state.setCurrentOrgId)

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allowedStudents, setAllowedStudents] = useState<AllowedStudent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [allowedStudentsSearchQuery, setAllowedStudentsSearchQuery] = useState('')
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

  // Allowed Students state
  const [addAllowedStudentOpen, setAddAllowedStudentOpen] = useState(false)
  const [editAllowedStudent, setEditAllowedStudent] = useState<AllowedStudent | null>(null)
  const [newAllowedStudent, setNewAllowedStudent] = useState({ name: '', email: '', status: 'active' as 'active' | 'inactive' })
  const [deleteAllowedStudentConfirm, setDeleteAllowedStudentConfirm] = useState<{ open: boolean; studentId: string; studentName: string } | null>(null)

  // Processing states for double-click prevention
  const [isProcessing, setIsProcessing] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [addingStudent, setAddingStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState(false)
  const [creatingOrg, setCreatingOrg] = useState(false)

  const filteredUsers = (users || []).filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAllowedStudents = (allowedStudents || []).filter(
    (student) =>
      student.name.toLowerCase().includes(allowedStudentsSearchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(allowedStudentsSearchQuery.toLowerCase())
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [orgsRes, usersRes, settingsRes, allowedStudentsRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/users'),
        fetch('/api/settings'),
        fetch('/api/allowed-students'),
      ])
      const orgsData = await orgsRes.json()
      const usersData = await usersRes.json()
      const settingsData = await settingsRes.json()
      const allowedStudentsData = await allowedStudentsRes.json()

      setOrganizations(orgsData.organizations || [])
      setUsers(usersData.users || [])
      if (settingsData.settings) {
        setSettings(settingsData.settings)
      }
      setAllowedStudents(allowedStudentsData.students || [])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data',
      })
      // Set empty arrays on error to prevent undefined issues
      setOrganizations([])
      setUsers([])
      setAllowedStudents([])
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
    setIsProcessing(true)

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
    } finally {
      setIsProcessing(false)
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteUserConfirm) return
    setIsProcessing(true)

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
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteOrgConfirm = async () => {
    if (!deleteOrgConfirm) return
    setIsProcessing(true)

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
    } finally {
      setIsProcessing(false)
    }
  }

  // Allowed Students handlers
  const handleAddAllowedStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingStudent(true)
    try {
      const response = await fetch('/api/allowed-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAllowedStudent),
      })

      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Student added to allowed list',
        })
        setAddAllowedStudentOpen(false)
        setNewAllowedStudent({ name: '', email: '', status: 'active' })
        loadData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to add student',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add student',
      })
    } finally {
      setAddingStudent(false)
    }
  }

  const handleEditAllowedStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAllowedStudent) return
    setEditingStudent(true)

    try {
      const response = await fetch('/api/allowed-students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editAllowedStudent.id,
          name: editAllowedStudent.name,
          email: editAllowedStudent.email,
          status: editAllowedStudent.status,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Student updated successfully',
        })
        setEditAllowedStudent(null)
        loadData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update student',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update student',
      })
    } finally {
      setEditingStudent(false)
    }
  }

  const confirmDeleteAllowedStudent = async () => {
    if (!deleteAllowedStudentConfirm) return
    setIsProcessing(true)

    try {
      const response = await fetch(`/api/allowed-students?id=${deleteAllowedStudentConfirm.studentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Student removed from allowed list',
        })
        setDeleteAllowedStudentConfirm(null)
        loadData()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to remove student',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove student',
      })
    } finally {
      setIsProcessing(false)
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
    setIsProcessing(true)

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
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingOrg(true)

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
    } finally {
      setCreatingOrg(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
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
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="container py-6 sm:py-8 px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">System Administration</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage users, organizations, allowed students, and global settings
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48 sm:w-64" />
          <div className="h-32 sm:h-48 bg-muted rounded" />
        </div>
      ) : (
        <Tabs defaultValue="allowed-students" className="space-y-6">
          <TabsList className="w-full flex flex-wrap">
            <TabsTrigger value="allowed-students">Allowed Students</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Allowed Students Tab */}
          <TabsContent value="allowed-students">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Allowed Students
                    </CardTitle>
                    <CardDescription>
                      Manage student emails that can register for accounts
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {allowedStudents.length} student{allowedStudents.length !== 1 ? 's' : ''}
                    </div>
                    <Button onClick={() => setAddAllowedStudentOpen(true)} className="h-10">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Student
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={allowedStudentsSearchQuery}
                      onChange={(e) => setAllowedStudentsSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                {/* Allowed Students List */}
                <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto">
                  {filteredAllowedStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {allowedStudentsSearchQuery
                          ? `No students found matching "${allowedStudentsSearchQuery}"`
                          : 'No allowed students yet. Add students who can register.'}
                      </p>
                    </div>
                  ) : (
                    filteredAllowedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm sm:text-base">{student.name}</p>
                            <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {student.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditAllowedStudent(student)}
                            title="Edit Student"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteAllowedStudentConfirm({
                              open: true,
                              studentId: student.id,
                              studentName: student.name,
                            })}
                            title="Remove Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                            {u.role === 'Student' && u.membershipStatus && (
                              <Badge variant={u.membershipStatus === 'Paid' ? 'default' : 'destructive'} className="text-xs">
                                {u.membershipStatus}
                              </Badge>
                            )}
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
                        <Button type="submit" className="w-full h-11" disabled={creatingOrg}>
                          {creatingOrg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          {creatingOrg ? 'Creating...' : 'Create Organization'}
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
                  <Button className="w-full sm:w-auto h-11" onClick={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Allowed Student Dialog */}
      <Dialog open={addAllowedStudentOpen} onOpenChange={setAddAllowedStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowed Student</DialogTitle>
            <DialogDescription>
              Add a student email that can register for an account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAllowedStudent} className="space-y-4">
            <div>
              <Label htmlFor="studentName">Full Name</Label>
              <Input
                id="studentName"
                value={newAllowedStudent.name}
                onChange={(e) => setNewAllowedStudent({ ...newAllowedStudent, name: e.target.value })}
                placeholder="Enter student's full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="studentEmail">Email Address</Label>
              <Input
                id="studentEmail"
                type="email"
                value={newAllowedStudent.email}
                onChange={(e) => setNewAllowedStudent({ ...newAllowedStudent, email: e.target.value })}
                placeholder="Enter student's email"
                required
              />
            </div>
            <div>
              <Label htmlFor="studentStatus">Status</Label>
              <Select
                value={newAllowedStudent.status}
                onValueChange={(value: 'active' | 'inactive') => setNewAllowedStudent({ ...newAllowedStudent, status: value })}
              >
                <SelectTrigger id="studentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Can Register)</SelectItem>
                  <SelectItem value="inactive">Inactive (Cannot Register)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddAllowedStudentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingStudent}>
                {addingStudent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {addingStudent ? 'Adding...' : 'Add Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Allowed Student Dialog */}
      <Dialog open={!!editAllowedStudent} onOpenChange={(open) => setEditAllowedStudent(open ? editAllowedStudent : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allowed Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          {editAllowedStudent && (
            <form onSubmit={handleEditAllowedStudent} className="space-y-4">
              <div>
                <Label htmlFor="editStudentName">Full Name</Label>
                <Input
                  id="editStudentName"
                  value={editAllowedStudent.name}
                  onChange={(e) => setEditAllowedStudent({ ...editAllowedStudent, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editStudentEmail">Email Address</Label>
                <Input
                  id="editStudentEmail"
                  type="email"
                  value={editAllowedStudent.email}
                  onChange={(e) => setEditAllowedStudent({ ...editAllowedStudent, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editStudentStatus">Status</Label>
                <Select
                  value={editAllowedStudent.status}
                  onValueChange={(value: 'active' | 'inactive') => setEditAllowedStudent({ ...editAllowedStudent, status: value })}
                >
                  <SelectTrigger id="editStudentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Can Register)</SelectItem>
                    <SelectItem value="inactive">Inactive (Cannot Register)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditAllowedStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editingStudent}>
                {editingStudent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingStudent ? 'Updating...' : 'Update Student'}
              </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Allowed Student Confirmation Dialog */}
      <AlertDialog open={!!deleteAllowedStudentConfirm} onOpenChange={(open) => setDeleteAllowedStudentConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allowed Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{deleteAllowedStudentConfirm?.studentName}</span> from the allowed list?
              They will no longer be able to register with this email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAllowedStudent} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <Button onClick={handleOrgSelectSubmit} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isProcessing ? 'Assigning...' : `Assign ${orgSelectDialog?.selectedOrgs?.length || 0} Org${orgSelectDialog?.selectedOrgs?.length !== 1 ? 'izations' : 'ization'}`}
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
            <AlertDialogAction onClick={confirmRoleChange} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Processing...' : 'Confirm Change'}
            </AlertDialogAction>
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
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
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
            <AlertDialogAction onClick={handleDeleteOrgConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Deleting...' : 'Delete Organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
