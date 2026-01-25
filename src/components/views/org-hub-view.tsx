'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'
import { ArrowLeft, Edit, Trash2, MessageSquare, Users, Calendar, DollarSign, Heart, MessageCircle, Send, Plus, Download, FileText } from 'lucide-react'
import ImageUpload from '@/components/ui/image-upload'
import PDFUpload from '@/components/ui/pdf-upload'

interface OrgHubViewProps {
  setCurrentView: (view: any) => void
}

interface Organization {
  id: string
  name: string
  description: string
  mission: string
  logo?: string
  cover?: string
  members: any[]
  activities: any[]
  budgets: any[]
  feedback: any[]
  requests: any[]
  cbl?: {
    data: string
    fileName: string
    uploadedAt: string
  } | null
}

interface Activity {
  id: string
  title: string
  date: string
  description: string
  image?: string
}

interface Budget {
  id: string
  category: string
  allocated: number
  limit: number
}

interface Post {
  id: string
  content: string
  imageUrl?: string
  createdAt: string
  author: {
    id: string
    name: string
    avatar?: string
    email: string
  }
  reactions: Array<{
    id: string
    type: string
    author: {
      id: string
      name: string
      avatar?: string
    }
  }>
}

export default function OrgHubView({ setCurrentView }: OrgHubViewProps) {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const currentOrgId = useAppStore((state) => state.currentOrgId)
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Organization | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const tabsListRef = useRef<HTMLDivElement>(null)

  // Memoize functions that depend on user, org, and currentOrgId to prevent re-renders
  const canEdit = useCallback(() => {
    console.log('canEdit check - user:', user, 'org:', org, 'currentOrgId:', currentOrgId)
    if (user?.role === 'Admin') {
      console.log('User is Admin, canEdit = true')
      return true
    }
    if (user?.role === 'OrgAdmin') {
      // Check if user is a member with Admin role
      const isAdmin = org?.members?.some(
        (m: any) => {
          const result = m.userId === user.id && m.role === 'Admin'
          console.log('Checking member:', m, 'isAdmin:', result)
          return result
        }
      )

      // Also check if user manages this org (fallback for missing membership entries)
      const managesThisOrg = user.managedOrgs && user.managedOrgs.includes(currentOrgId)
      console.log('OrgAdmin check - isAdmin:', isAdmin, 'managesThisOrg:', managesThisOrg)

      return isAdmin || managesThisOrg
    }
    console.log('User is not Admin or OrgAdmin, canEdit = false')
    return false
  }, [user, org, currentOrgId])

  const isMember = useCallback(() => {
    return org?.members?.some((m: any) => m.userId === user?.id)
  }, [user, org])

  // Activity state
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [viewActivityDialogOpen, setViewActivityDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null)
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '',
    description: '',
    image: '',
  })

  // Budget state
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    allocated: '',
    limit: '',
  })

  // Student payment state
  const [totalStudentsInput, setTotalStudentsInput] = useState('0')
  const [paidStudentsInput, setPaidStudentsInput] = useState('0')
  const [studentFee, setStudentFee] = useState('150')

  // Combined Budget & Collection Management Modal state
  const [budgetCollectionModalOpen, setBudgetCollectionModalOpen] = useState(false)
  const [activeManagementTab, setActiveManagementTab] = useState<'budget' | 'collection'>('budget')

  // Feedback state
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [replyingToFeedback, setReplyingToFeedback] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Edit Org state
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false)
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    description: '',
    mission: '',
    logo: '',
    cover: '',
    cblData: null as string | null,
  })

  // Confirmation dialogs
  const [deleteActivityConfirm, setDeleteActivityConfirm] = useState<{ open: boolean; activityId: string; activityTitle: string } | null>(null)
  const [deleteBudgetConfirm, setDeleteBudgetConfirm] = useState<{ open: boolean; budgetId: string; budgetCategory: string } | null>(null)
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<{ open: boolean; memberId: string; memberName: string } | null>(null)
  const [joinRequestConfirm, setJoinRequestConfirm] = useState<{ open: boolean; requestId: string; userName: string; action: 'approve' | 'reject' } | null>(null)
  const [deleteFeedbackConfirm, setDeleteFeedbackConfirm] = useState<{ open: boolean; feedbackId: string; userName: string } | null>(null)

  // Feed state
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState('')
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [viewingPost, setViewingPost] = useState<Post | null>(null)
  const [editPostContent, setEditPostContent] = useState('')
  const [editPostImage, setEditPostImage] = useState('')
  const [deletePostConfirm, setDeletePostConfirm] = useState<{ open: boolean; postId: string; postContent: string } | null>(null)

  // Custom role dialog state
  const [customRoleDialogOpen, setCustomRoleDialogOpen] = useState(false)
  const [customRoleForMember, setCustomRoleForMember] = useState<{ userId: string; currentRole: string } | null>(null)
  const [customRoleInput, setCustomRoleInput] = useState('')

  // Role change confirmation state
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    open: boolean
    userId: string
    userName: string
    currentRole: string
    newRole: string
  } | null>(null)


  useEffect(() => {
    if (currentOrgId) {
      loadOrganization()
      loadPosts()
    }
  }, [currentOrgId])

  // Scroll tabs to leftmost position on mount and render
  useEffect(() => {
    const scrollableElement = tabsListRef.current
    if (!scrollableElement) return

    // Force scroll to farthest left position possible (-100px)
    const forceScrollToStart = () => {
      if (scrollableElement) {
        scrollableElement.scrollLeft = 0
        // Also try with scrollTo method
        scrollableElement.scrollTo({
          left: 0,
          top: 0,
          behavior: 'auto'
        })
        console.log('Forced scroll to start, scrollLeft:', scrollableElement.scrollLeft, 'scrollWidth:', scrollableElement.scrollWidth)
      }
    }

    // Force immediately
    forceScrollToStart()

    // Force again after render using requestAnimationFrame
    requestAnimationFrame(() => {
      setTimeout(forceScrollToStart, 50)
    })

    // Additional delayed attempts
    const timer1 = setTimeout(forceScrollToStart, 100)
    const timer2 = setTimeout(forceScrollToStart, 300)
    const timer3 = setTimeout(forceScrollToStart, 600)

    // Cleanup
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [activeTab, org, loading])

  // Force scroll to left when activeTab changes
  useEffect(() => {
    const scrollableElement = tabsListRef.current
    if (scrollableElement && activeTab) {
      requestAnimationFrame(() => {
        scrollableElement.scrollLeft = 0
        scrollableElement.scrollTo({
          left: 0,
          top: 0,
          behavior: 'auto'
        })
      })
    }
  }, [activeTab])

  const loadOrganization = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/organizations?id=${currentOrgId}`)
      const data = await response.json()
      setOrg(data.org)
      
      if (data.org) {
        setEditOrgForm({
          name: data.org.name,
          description: data.org.description,
          mission: data.org.mission,
          logo: data.org.logo || '',
          cover: data.org.cover || '',
        })

        // Load collection data if exists
        if (data.org.collectionData) {
          setTotalStudentsInput(data.org.collectionData.totalStudents?.toString() || '0')
          setPaidStudentsInput(data.org.collectionData.paidStudents?.toString() || '0')
          setStudentFee(data.org.collectionData.studentFee?.toString() || '150')
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load organization',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOrgId,
          ...editOrgForm,
        }),
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Organization updated' })
        setEditOrgDialogOpen(false)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update' })
    }
  }

  // Activity handlers
  const openActivityDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity)
      setActivityForm({
        title: activity.title,
        date: activity.date.split('T')[0],
        description: activity.description,
        image: activity.image || '',
      })
    } else {
      setEditingActivity(null)
      setActivityForm({ title: '', date: '', description: '', image: '' })
    }
    setActivityDialogOpen(true)
  }

  const openViewActivityDialog = (activity: Activity) => {
    setViewingActivity(activity)
    setViewActivityDialogOpen(true)
  }

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingActivity ? '/api/activities' : '/api/activities'
      const method = editingActivity ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingActivity?.id,
          orgId: currentOrgId,
          ...activityForm,
        }),
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Activity saved' })
        setActivityDialogOpen(false)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' })
    }
  }

  const handleDeleteActivity = async (id: string) => {
    const activity = org?.activities?.find((a: any) => a.id === id)
    if (!activity) return
    setDeleteActivityConfirm({
      open: true,
      activityId: id,
      activityTitle: activity.title || 'this activity',
    })
  }

  const confirmDeleteActivity = async () => {
    if (!deleteActivityConfirm) return

    try {
      const response = await fetch(`/api/activities?id=${deleteActivityConfirm.activityId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Activity deleted',
        })
        setDeleteActivityConfirm(null)
        loadOrganization()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete activity',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete activity',
      })
    }
  }

  // Budget handlers
  const openBudgetDialog = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget)
      setBudgetForm({
        category: budget.category,
        allocated: budget.allocated.toString(),
        limit: budget.limit.toString(),
      })
    } else {
      setEditingBudget(null)
      setBudgetForm({ category: '', allocated: '', limit: '' })
    }
    setBudgetDialogOpen(true)
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingBudget ? '/api/budgets' : '/api/budgets'
      const method = editingBudget ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBudget?.id,
          orgId: currentOrgId,
          category: budgetForm.category,
          allocated: parseFloat(budgetForm.allocated) || 0,
          limit: parseFloat(budgetForm.limit),
        }),
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Budget saved' })
        setBudgetDialogOpen(false)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' })
    }
  }

  const handleDeleteBudget = async (id: string) => {
    const budget = org?.budgets?.find((b: any) => b.id === id)
    if (!budget) return
    setDeleteBudgetConfirm({
      open: true,
      budgetId: id,
      budgetCategory: budget.category || 'this budget',
    })
  }

  const confirmDeleteBudget = async () => {
    if (!deleteBudgetConfirm) return

    try {
      const response = await fetch(`/api/budgets?id=${deleteBudgetConfirm.budgetId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Budget deleted',
        })
        setDeleteBudgetConfirm(null)
        loadOrganization()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete budget',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete budget',
      })
    }
  }

  const openBudgetCollectionModal = () => {
    setBudgetCollectionModalOpen(true)
  }

  const handleSaveCollectionData = async () => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOrgId,
          collectionData: {
            totalStudents: totalStudentsInput,
            paidStudents: paidStudentsInput,
            studentFee: studentFee,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Collection data saved successfully',
        })
        loadOrganization()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to save collection data',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save collection data',
      })
    }
  }

  // Feedback handlers
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          userId: user?.id,
          message: feedbackMessage,
          isAnonymous,
        }),
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Feedback submitted' })
        setFeedbackMessage('')
        setIsAnonymous(false)
        setFeedbackDialogOpen(false)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit' })
    }
  }

  const handleMarkFeedbackReviewed = async (id: string) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'reviewed' }),
      })

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update' })
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyingToFeedback || !replyMessage.trim()) return

    try {
      const response = await fetch('/api/feedback/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: replyingToFeedback,
          userId: user?.id,
          message: replyMessage.trim(),
        }),
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Reply sent' })
        setReplyMessage('')
        setReplyingToFeedback(null)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send reply' })
    }
  }

  const handleDeleteFeedback = async (feedbackId: string, userName: string) => {
    setDeleteFeedbackConfirm({
      open: true,
      feedbackId,
      userName,
    })
  }

  const confirmDeleteFeedback = async () => {
    if (!deleteFeedbackConfirm) return

    try {
      const response = await fetch(`/api/feedback?id=${deleteFeedbackConfirm.feedbackId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Feedback conversation deleted',
        })
        setDeleteFeedbackConfirm(null)
        loadOrganization()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete feedback',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete feedback',
      })
    }
  }

  // Join request handlers
  const handleRequestJoin = async () => {
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          userId: user?.id,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Success', description: 'Request sent' })
        loadOrganization()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send request' })
    }
  }

  const handleJoinRequest = async (id: string, status: 'approve' | 'reject') => {
    console.log('=== handleJoinRequest called ===')
    console.log('Request ID:', id, 'Status:', status)
    const request = org?.requests?.find((r: any) => r.id === id)
    console.log('Found request:', request)
    if (!request) {
      console.log('Request not found!')
      return
    }
    // Use request.user directly since it's already populated from API
    console.log('User from request:', request.user?.name, request.user?.email)
    setJoinRequestConfirm({
      open: true,
      requestId: id,
      userName: request.user?.name || 'this user',
      action: status,
    })
  }

  const confirmJoinRequest = async () => {
    console.log('=== confirmJoinRequest called ===')
    console.log('joinRequestConfirm:', joinRequestConfirm)
    if (!joinRequestConfirm) {
      console.log('No joinRequestConfirm, returning')
      return
    }

    try {
      console.log('Sending PUT request to /api/requests...')
      // Map action to the correct status
      const status = joinRequestConfirm.action === 'approve' ? 'approved' : 'rejected'

      const response = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: joinRequestConfirm.requestId, status }),
      })

      console.log('Response status:', response.status, 'Response ok:', response.ok)

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Request ${joinRequestConfirm.action}d`,
        })
        setJoinRequestConfirm(null)
        loadOrganization()
      } else {
        const data = await response.json()
        console.log('Error response:', data)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update request',
        })
      }
    } catch (error) {
      console.error('Error in confirmJoinRequest:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update request',
      })
    }
  }

  // Member handlers
  const handleChangeMemberRole = async (userId: string, newRole: string) => {
    // If "Other" is selected, open the custom role dialog (no confirmation needed yet)
    if (newRole === 'Other') {
      const member = org?.members?.find((m: any) => m.userId === userId)
      setCustomRoleForMember({
        userId,
        currentRole: member?.role || 'Member'
      })
      setCustomRoleInput('')
      setCustomRoleDialogOpen(true)
      return
    }

    // Show confirmation dialog for role changes
    const member = org?.members?.find((m: any) => m.userId === userId)
    if (!member) return

    setRoleChangeConfirm({
      open: true,
      userId,
      userName: member.user?.name || 'this member',
      currentRole: member.role,
      newRole,
    })
  }

  const confirmRoleChange = async () => {
    if (!roleChangeConfirm) return

    try {
      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          userId: roleChangeConfirm.userId,
          role: roleChangeConfirm.newRole,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Role updated from ${roleChangeConfirm.currentRole} to ${roleChangeConfirm.newRole}`,
        })
        setRoleChangeConfirm(null)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role' })
    }
  }

  const handleSaveCustomRole = async () => {
    if (!customRoleForMember || !customRoleInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a role name',
      })
      return
    }

    try {
      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          userId: customRoleForMember.userId,
          role: customRoleInput.trim(),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Role updated to ${customRoleInput.trim()}`,
        })
        setCustomRoleDialogOpen(false)
        setCustomRoleInput('')
        setCustomRoleForMember(null)
        loadOrganization()
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role' })
    }
  }

  const handleToggleShowInLeaders = async (userId: string, currentShowInLeaders: boolean) => {
    try {
      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          userId,
          showInLeaders: !currentShowInLeaders,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: !currentShowInLeaders
            ? 'Member added to Leaders section'
            : 'Member removed from Leaders section',
        })
        loadOrganization()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update Leaders visibility',
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const member = org?.members?.find((m: any) => m.userId === userId)
    if (!member) return
    setRemoveMemberConfirm({
      open: true,
      memberId: userId,
      memberName: member.user?.name || 'this member',
    })
  }

  const confirmRemoveMember = async () => {
    if (!removeMemberConfirm) return

    try {
      const response = await fetch(`/api/members?orgId=${currentOrgId}&userId=${removeMemberConfirm.memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Member removed',
        })
        setRemoveMemberConfirm(null)
        loadOrganization()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to remove member',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove member',
      })
    }
  }

  // Feed handlers
  const loadPosts = async () => {
    setPostsLoading(true)
    // Clear posts immediately to prevent showing wrong org's posts
    setPosts([])
    try {
      console.log('Loading posts for orgId:', currentOrgId)
      // Pass userId for authorization check
      const response = await fetch(`/api/posts?orgId=${currentOrgId}&userId=${user?.id || ''}`)
      const data = await response.json()
      const freshPosts = data.posts || []
      console.log('Loaded posts:', freshPosts.map(p => ({ id: p.id, orgId: p.orgId, author: p.author?.name })))
      setPosts(freshPosts)
      return freshPosts
    } catch (error) {
      console.error('Failed to load posts:', error)
      return []
    } finally {
      setPostsLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          content: newPostContent,
          imageUrl: newPostImage,
          authorId: user.id,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Success', description: 'Post created' })
        setNewPostDialogOpen(false)
        setNewPostContent('')
        setNewPostImage('')
        loadPosts()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create post' })
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setEditPostContent(post.content)
    setEditPostImage(post.imageUrl || '')
    setNewPostDialogOpen(true)
  }

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPost || !user?.id) return

    try {
      const response = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPost.id,
          content: editPostContent,
          imageUrl: editPostImage,
          userId: user?.id,  // Pass userId for authorization
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Success', description: 'Post updated' })
        setEditingPost(null)
        setEditPostContent('')
        setEditPostImage('')
        setNewPostDialogOpen(false)

        // Reload posts and get fresh data
        const freshPosts = await loadPosts()

        // If the edited post is currently being viewed, update it with fresh data
        if (viewingPost && viewingPost.id === editingPost.id) {
          const freshPost = freshPosts.find((p: Post) => p.id === editingPost.id)
          if (freshPost) {
            setViewingPost(freshPost)
          }
        }
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update post' })
    }
  }

  const handleDeletePost = async (postId: string, postContent: string) => {
    setDeletePostConfirm({
      open: true,
      postId,
      postContent,
    })
  }

  const confirmDeletePost = async () => {
    if (!deletePostConfirm) return

    try {
      // Pass userId for authorization check
      const response = await fetch(`/api/posts?id=${deletePostConfirm.postId}&userId=${user?.id || ''}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: 'Success', description: 'Post deleted' })
        setDeletePostConfirm(null)

        // Close the post view modal if viewing the deleted post
        if (viewingPost && viewingPost.id === deletePostConfirm.postId) {
          setViewingPost(null)
        }

        loadPosts()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete post',
        })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete post' })
    }
  }

  if (loading || !org) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const totalBudget = org.budgets.reduce((sum, b) => sum + b.limit, 0)
  const totalAllocated = org.budgets.reduce((sum, b) => sum + b.allocated, 0)
  const budgetUtilization = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0

  // Helper function to format amounts with peso sign
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace('PHP', '₱')
  }

  // Calculate collection statistics from numeric inputs
  const totalStudents = parseInt(totalStudentsInput) || 0
  const paidStudents = parseInt(paidStudentsInput) || 0
  const notPaidStudents = Math.max(0, totalStudents - paidStudents)
  const fee = parseInt(studentFee) || 150
  const paidAmount = paidStudents * fee
  const notPaidAmount = notPaidStudents * fee
  const totalAmount = totalStudents * fee

  const pendingRequests = org.requests.filter((r: any) => r.status === 'pending')

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-red-50/30 to-rose-50/30 py-6 sm:py-8 px-4">
      <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4 sm:mb-6 h-10">
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Back to Dashboard</span>
        <span className="sm:hidden">Back</span>
      </Button>

      {/* Info Banner for Non-Members */}
      {!isMember() && user?.role === 'Student' && (
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-amber-200 dark:border-red-800">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                Viewing {org.name}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You can view all organization details including activities, members, posts, and budget information. Request to join to participate!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Org Header */}
      <Card className="mb-4 sm:mb-6 overflow-hidden">
        <div className="h-36 sm:h-48 bg-muted relative overflow-hidden">
          {org.cover ? (
            <img src={org.cover} alt={org.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background -mt-12 sm:-mt-14 shadow-lg flex-shrink-0">
              {org.logo ? (
                <AvatarImage src={org.logo} alt={org.name} />
              ) : (
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {org.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{org.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">{org.mission}</p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{org.members?.length || 0} members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{org.activities?.length || 0} activities</span>
                </div>
              </div>
            </div>
            {canEdit() && (
              <div className="self-start sm:self-auto -mt-10 sm:mt-0 flex-shrink-0">
                <Dialog open={editOrgDialogOpen} onOpenChange={setEditOrgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-10 px-3 sm:h-auto sm:px-4 flex-shrink-0">
                      <Edit className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline font-medium">Edit Profile</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Organization</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveOrg} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={editOrgForm.name}
                          onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editOrgForm.description}
                          onChange={(e) => setEditOrgForm({ ...editOrgForm, description: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="mission">Mission</Label>
                        <Input
                          id="mission"
                          value={editOrgForm.mission}
                          onChange={(e) => setEditOrgForm({ ...editOrgForm, mission: e.target.value })}
                          required
                        />
                      </div>
                      <ImageUpload
                        label="Logo"
                        currentImage={org?.logo}
                        onImageChange={(base64) => setEditOrgForm({ ...editOrgForm, logo: base64 || '' })}
                        className="mb-4"
                      />
                      <ImageUpload
                        label="Cover Image"
                        currentImage={org?.cover}
                        onImageChange={(base64) => setEditOrgForm({ ...editOrgForm, cover: base64 || '' })}
                        className="mb-4"
                      />
                      <PDFUpload
                        label="Constitution & By-Laws (CBL)"
                        currentPDF={org?.cbl || null}
                        onPDFChange={(pdfData) => setEditOrgForm({ ...editOrgForm, cblData: pdfData })}
                        className="mb-4"
                        maxSizeMB={10}
                      />
                      <Button type="submit" className="w-full h-11">
                        Save Changes
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList ref={tabsListRef} dir="ltr" className="w-full md:grid md:grid-cols-6 gap-1 md:gap-3 py-1 h-[56px] overflow-x-auto overflow-y-hidden scrollbar-hide">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-1.5 sm:px-4 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
          >
            <span className="font-semibold">Overview</span>
            {activeTab === 'overview' && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-2 sm:px-5 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">Activities</span>
              <Badge className="text-[10px] sm:text-xs sm:text-sm h-[18px] sm:h-5 sm:h-6 px-1 sm:px-1.5 flex-shrink-0 bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 border-red-200">
                {org.activities.length}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-2 sm:px-5 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">Budget</span>
              <Badge className="text-[10px] sm:text-xs sm:text-sm h-[18px] sm:h-5 sm:h-6 px-1 sm:px-1.5 flex-shrink-0 bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 border-red-200">
                {org.budgets.length}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="feedback"
            className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-2 sm:px-5 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">Feedback</span>
              <Badge className="text-[10px] sm:text-xs sm:text-sm h-[18px] sm:h-5 sm:h-6 px-1 sm:px-1.5 flex-shrink-0 bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 border-red-200">
                {org.feedback.length}
              </Badge>
            </div>
          </TabsTrigger>
          {canEdit() && (
            <TabsTrigger
              value="requests"
              className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-2 sm:px-5 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-semibold text-xs sm:text-sm">Requests</span>
                {pendingRequests.length > 0 && (
                  <Badge className="text-[10px] sm:text-xs sm:text-sm h-[18px] sm:h-5 sm:h-6 px-1 sm:px-1.5 flex-shrink-0 bg-gradient-to-r from-red-500 to-rose-500 text-white">
                    {pendingRequests.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          )}
          {canEdit() && (
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-gradient-to-r from-red-600 to-rose-600 data-[state=active]:text-white relative group h-12 px-2 sm:px-5 text-sm sm:text-base font-semibold whitespace-nowrap flex-shrink-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-semibold text-xs sm:text-sm">Members</span>
                {org.members.length > 1 && (
                  <Badge className="text-[10px] sm:text-xs sm:text-sm h-[18px] sm:h-5 sm:h-6 px-1 sm:px-1.5 flex-shrink-0 bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 border-red-200">
                    {org.members.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          {canEdit() ? (
            // Admin View - Original layout
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-lg">📜</span>
                    About & Mission
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">Mission:</h4>
                    <p className="text-muted-foreground text-sm">{org.mission}</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm">{org.description}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    Leaders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-6">
                    {/* Vertical dashed connector line */}
                    <div className="absolute left-2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border/60"></div>

                    <div className="space-y-4">
                      {org.members?.filter((m: any) => m.role !== 'Member' && m.showInLeaders !== false).length > 0 ? (
                        org.members
                          .filter((m: any) => m.role !== 'Member' && m.showInLeaders !== false)
                          .map((member: any) => (
                            <div key={member.userId} className="relative flex items-center gap-4">
                              {/* Connector dot */}
                              <div className="absolute left-[-18px] w-2 h-2 rounded-full bg-border/80"></div>

                              {/* Leader card */}
                              <div className="flex-1 flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-300 shadow-sm">
                                {/* Circular profile photo */}
                                <Avatar className="w-12 h-12 flex-shrink-0">
                                  <AvatarImage src={member.user?.avatar} alt={member.user?.name || member.role} />
                                  <AvatarFallback className="text-sm font-semibold bg-gray-100 text-gray-700">
                                    {(member.user?.name || member.role).substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                {/* Text content */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold uppercase tracking-wide text-gray-900">
                                    {member.user?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-600 font-normal">
                                    {member.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No leaders assigned yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Budget Utilization</span>
                      <span className="font-semibold">{totalBudget > 0 ? budgetUtilization.toFixed(1) : '-'}</span>
                    </div>
                    {totalBudget > 0 && (
                      <Progress value={budgetUtilization} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalBudget > 0
                        ? `${formatCurrency(totalAllocated)} of ${formatCurrency(totalBudget)} allocated`
                        : 'No budget items'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Constitution & By-Laws
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {org.cbl && org.cbl.data ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-amber-50 rounded-lg border border-red-200">
                        <FileText className="w-10 h-10 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-900">
                            {org.cbl.fileName || 'Constitution & By-Laws.pdf'}
                          </p>
                          <p className="text-xs text-red-700">
                            Uploaded: {org.cbl.uploadedAt ? new Date(org.cbl.uploadedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = org.cbl.data
                          link.download = org.cbl.fileName || 'Constitution_By_Laws.pdf'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          toast({
                            title: 'Success',
                            description: 'PDF downloaded successfully',
                          })
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No Constitution & By-Laws uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            // Student View - Simplified layout
            <div className="space-y-4">
              {/* About & Mission */}
              <Card className="bg-white rounded-2xl border-gray-200 overflow-hidden">
                {/* Infographic Header */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 px-6 py-8">
                  <div className="text-center mb-6">
                    <p className="text-5xl mb-2">📜</p>
                    <h2 className="text-4xl font-bold text-amber-700">About & Mission</h2>
                  </div>
                </div>

                {/* Infographic Content */}
                <div className="px-8 py-10 bg-blue-50/30 space-y-8">
                  {/* Mission Section */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-12 bg-blue-600 rounded-full"></div>
                      <div>
                        <h3 className="text-2xl font-bold text-amber-700 mb-2">Our Mission</h3>
                        <p className="text-lg text-gray-700 leading-relaxed font-sans">
                          {org.mission}
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                  </div>

                  {/* About Us Section */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-12 bg-blue-500 rounded-full"></div>
                      <div>
                        <h3 className="text-2xl font-bold text-amber-700 mb-2">About Us</h3>
                        <p className="text-lg text-gray-700 leading-relaxed font-sans">
                          {org.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Leaders */}
              <Card className="border-2 border-primary/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <CardTitle>Leaders</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {org.members?.filter((m: any) => m.role !== 'Member' && m.showInLeaders !== false).length > 0 ? (
                    <div className="relative pl-6">
                      {/* Vertical dashed connector line */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border/60"></div>

                      <div className="space-y-4">
                        {org.members
                          .filter((m: any) => m.role !== 'Member' && m.showInLeaders !== false)
                          .map((member: any) => (
                            <div key={member.userId} className="relative flex items-center gap-4">
                              {/* Connector dot */}
                              <div className="absolute left-[-18px] w-2 h-2 rounded-full bg-border/80"></div>

                              {/* Leader card */}
                              <div className="flex-1 flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-300 shadow-sm">
                                {/* Circular profile photo */}
                                <Avatar className="w-12 h-12 flex-shrink-0">
                                  <AvatarImage src={member.user?.avatar} alt={member.user?.name || member.role} />
                                  <AvatarFallback className="text-sm font-semibold bg-gray-100 text-gray-700">
                                    {(member.user?.name || member.role).substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                {/* Text content */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold uppercase tracking-wide text-gray-900">
                                    {member.user?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-600 font-normal">
                                    {member.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No leaders assigned yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Constitution & By-Laws Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📜</span>
                    <CardTitle>Constitution & By-Laws</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {org.cbl && org.cbl.data ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-amber-50 rounded-lg border border-red-200">
                        <FileText className="w-10 h-10 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-900">
                            {org.cbl.fileName || 'Constitution & By-Laws.pdf'}
                          </p>
                          <p className="text-xs text-red-700">
                            Uploaded: {org.cbl.uploadedAt ? new Date(org.cbl.uploadedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = org.cbl.data
                          link.download = org.cbl.fileName || 'Constitution_By_Laws.pdf'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          toast({
                            title: 'Success',
                            description: 'PDF downloaded successfully',
                          })
                        }}
                        className="w-full"
                        variant="default"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm mb-2">No Constitution & By-Laws available</p>
                      <p className="text-xs text-muted-foreground">
                        Check back later or contact organization admins
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Activities */}
                <Card
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setActiveTab('activities')}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold mb-1">{org.activities?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </CardContent>
                </Card>

                {/* Budget */}
                <Card
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setActiveTab('budget')}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold mb-1">{formatCurrency(totalBudget)}</p>
                    <p className="text-xs text-muted-foreground">Budget</p>
                  </CardContent>
                </Card>

                {/* Feedback */}
                <Card
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setActiveTab('feedback')}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold mb-1">{org.feedback?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Feedback</p>
                  </CardContent>
                </Card>
              </div>

              {/* Want to Know More */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6 text-center">
                  <p className="text-lg font-semibold mb-2">🚀 Want to know more?</p>
                  <p className="text-sm opacity-90 mb-4">
                    Reach out to our leaders or join our activities to get involved!
                  </p>
                  {isMember() ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/20 rounded-lg">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">Already a Member</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleRequestJoin}
                      variant="secondary"
                      size="lg"
                      className="bg-background text-primary-foreground hover:bg-background/30"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join Organization
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Join Organization Button for Non-Members */}
              {!isMember() && (
                <Card className="border-primary/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Join this organization to participate in activities and connect with other members.
                    </p>
                    <Button onClick={handleRequestJoin} variant="default" size="default" className="w-full">
                      Join Organization
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Feed Section */}
          <div className="mt-8 space-y-4">
            {/* Create Post - Only for org admins, not System Administrators */}
            {canEdit() && user?.role !== 'Admin' && (
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-muted-foreground mt-1" />
                        <Input
                          placeholder="Share something with the community..."
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          className="min-h-[60px] resize-none text-base border-input"
                        />
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setNewPostDialogOpen(true)}
                      className="h-12 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts Feed */}
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-20 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>No posts yet. Be the first to share something!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const hasLiked = post.reactions?.some((r) => r.author.id === user?.id && r.type === 'like')
                  const likeCount = post.reactions?.filter((r) => r.type === 'like').length || 0

                  return (
                    <Card key={post.id}>
                      <CardContent className="p-6">
                        {/* Post Header */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={post.author?.avatar} />
                              <AvatarFallback className="text-xs">
                                {post.author?.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm sm:text-base">{post.author?.name}</p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(post.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {canEdit() && user?.role !== 'Admin' && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 px-2 text-destructive hover:text-destructive/90"
                                onClick={() => handleEditPost(post)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 px-2 text-destructive hover:text-destructive/90"
                                onClick={() => handleDeletePost(post.id, post.content)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p
                          className="text-sm whitespace-pre-wrap break-words cursor-pointer hover:text-primary/80 transition-colors"
                          onClick={() => openPostView(post)}
                        >
                          {post.content}
                        </p>

                        {/* Post Image */}
                        {post.imageUrl && (
                          <div
                            className="mt-4 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openPostView(post)}
                          >
                            <img
                              src={post.imageUrl}
                              alt="Post"
                              className="w-full max-h-[250px] object-cover hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}


                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Activities */}
        <TabsContent value="activities">
          <div className="space-y-4">
            {canEdit() && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => openActivityDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </Button>
              </div>
            )}
            {org.activities.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activities yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {org.activities.map((activity: any) => (
                  <Card
                    key={activity.id}
                    className="overflow-hidden border-2 hover:border-primary/30 transition-all hover:shadow-lg"
                  >
                    {activity.image && (
                      <div className="h-48 bg-muted relative">
                        <img
                          src={activity.image}
                          alt={activity.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl font-semibold pr-2 line-clamp-1">{activity.title}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {new Date(activity.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-primary"
                          onClick={() => openViewActivityDialog(activity)}
                        >
                          View Details
                        </Button>
                        {canEdit() && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                openActivityDialog(activity)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteActivity(activity.id)
                              }}
                              className="h-9 w-9"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget">
          <div className="space-y-6">
            {org.budgets.length === 0 ? (
              <Card className="bg-gradient-to-br from-amber-50/50 to-rose-50/50">
                <CardContent className="py-16 text-center">
                  <p className="text-6xl font-bold text-red-700 mb-4">
                    ${totalBudget.toLocaleString()}
                  </p>
                  <p className="text-lg text-muted-foreground">Total Budget</p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-2xl border border-red-200/60 overflow-hidden">
                {/* Infographic Header */}
                <div className="bg-gradient-to-br from-amber-50 to-rose-50 px-6 py-8">
                  <h2 className="text-4xl font-bold text-red-800 text-center">
                    Budget Allocation
                  </h2>
                  <p className="text-center text-lg text-muted-foreground mt-2">
                    Total Budget: {formatCurrency(totalBudget)}
                  </p>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 space-y-4 sm:space-y-6">
                  {org.budgets.map((budget: any) => {
                    const utilization = budget.limit > 0 ? (budget.allocated / budget.limit) * 100 : 0
                    const barWidth = Math.max(8, utilization) // Minimum width for visibility
                    return (
                      <div key={budget.id} className="space-y-2">
                        {/* Category Label */}
                        <p className="text-sm sm:text-base font-semibold text-gray-700">
                          {budget.category}
                        </p>

                        {/* Horizontal Bar */}
                        <div className="relative h-8 sm:h-10 bg-red-100 rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-red-600 to-rose-600 transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          >
                            {/* Amount inside bar */}
                            <p className="absolute inset-0 flex items-center justify-center px-2 sm:px-4 text-white font-bold text-xs sm:text-sm font-sans truncate">
                              {formatCurrency(budget.allocated)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Collection Summary Table */}
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-red-200/60">
                  <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-3 sm:mb-4">Collection Summary</h3>
                  <div className="bg-white rounded-lg border border-red-200/60 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-red-50 to-rose-50">
                          <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-red-700">Description</th>
                          <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-red-700">Number of Students</th>
                          <th className="text-right px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-red-700">Amount (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-red-200/50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 font-medium">Total Students</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 text-center">{totalStudents}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 text-right">{formatCurrency(totalAmount)}</td>
                        </tr>
                        <tr className="border-t border-red-200/50 bg-green-50/50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 font-medium">Paid Students</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-700 text-center font-semibold">{paidStudents}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-700 text-right font-semibold">{formatCurrency(paidAmount)}</td>
                        </tr>
                        <tr className="border-t border-red-200/50 bg-red-50/50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 font-medium">Not Paid Students</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700 text-center font-semibold">{notPaidStudents}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700 text-right font-semibold">{formatCurrency(notPaidAmount)}</td>
                        </tr>
                        <tr className="border-t-2 border-red-300 bg-gradient-to-r from-red-100 to-rose-100">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-900 font-bold">Grand Total</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-900 text-center font-bold">{totalStudents}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-900 text-right font-bold">{formatCurrency(totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">Student fee: ₱{studentFee} per student</p>


                </div>

                {/* Footer with total */}
                <div className="bg-gradient-to-br from-amber-100 to-rose-100 px-4 sm:px-6 py-3 sm:py-4 text-center">
                  <p className="text-sm sm:text-lg text-muted-foreground">
                    Allocated: <span className="font-bold text-red-700">{formatCurrency(totalAllocated)}</span> of{' '}
                    <span className="font-bold text-red-700">{formatCurrency(totalBudget)}</span> total budget
                  </p>
                </div>

                {/* Admin Controls - Open Management Modal */}
                {canEdit() && (
                  <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-700">Manage Budget & Collections</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">Add/edit budget items and manage student payments</p>
                      </div>
                      <Button onClick={openBudgetCollectionModal} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 flex-shrink-0">
                        <Edit className="w-4 h-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">Manage</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Feedback */}
        <TabsContent value="feedback">
          <div className="space-y-6">
            {isMember() && !canEdit() && (
              <div className="flex justify-center">
                <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Send Feedback</DialogTitle>
                      <DialogDescription>
                        Share your thoughts and suggestions with us
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitFeedback} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="feedback-message">Your Message</Label>
                        <Textarea
                          id="feedback-message"
                          placeholder="Type your feedback here..."
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                          required
                          rows={5}
                          className="resize-none min-h-[120px]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="anonymous"
                          checked={isAnonymous}
                          onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                        />
                        <Label
                          htmlFor="anonymous"
                          className="text-sm font-normal cursor-pointer select-none"
                        >
                          Submit as Anonymous
                        </Label>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFeedbackDialogOpen(false)
                            setFeedbackMessage('')
                            setIsAnonymous(false)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700">
                          <Send className="w-4 h-4 mr-2" />
                          Submit Feedback
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {org.feedback.length === 0 ? (
              <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl border border-red-200/60 shadow-sm px-6 py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">No messages yet</h3>
                <p className="text-sm text-red-600">Be the first to start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {org.feedback.map((feedback: any) => (
                  <div
                    key={feedback.id}
                    className="bg-white rounded-2xl border border-red-200/60 shadow-sm overflow-hidden"
                  >
                    {/* Chat Header */}
                    <div className="bg-gradient-to-br from-amber-50 to-rose-50 px-6 py-3 border-b border-red-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            {!feedback.isAnonymous ? (
                              <>
                                <AvatarImage src={feedback.user?.avatar} />
                                <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 text-white">
                                  {feedback.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-slate-400 to-slate-500 text-white">
                                AU
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm text-gray-800">
                              {feedback.isAnonymous ? 'Anonymous User' : (feedback.user?.name || 'Unknown User')}
                            </p>
                            <p className="text-xs text-red-600">
                              {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={feedback.status === 'reviewed' ? 'default' : 'secondary'}
                            className={feedback.status === 'reviewed' ? 'bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 hover:bg-red-100' : ''}
                          >
                            {feedback.status === 'reviewed' ? 'Replied' : 'Pending'}
                          </Badge>
                          {canEdit() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteFeedback(feedback.id, feedback.isAnonymous ? 'Anonymous User' : (feedback.user?.name || 'Unknown User'))}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="px-6 py-4 space-y-4">
                      {/* Original feedback message (from user) */}
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {!feedback.isAnonymous ? (
                            <>
                              <AvatarImage src={feedback.user?.avatar} />
                              <AvatarFallback className="text-xs font-semibold bg-gradient-to-r from-red-600 to-rose-600 text-white">
                                {feedback.user?.name?.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-r from-slate-400 to-slate-500 text-white">
                              AU
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-full">
                            <p className="text-sm text-red-900 leading-relaxed">
                              {feedback.message}
                            </p>
                          </div>
                          <p className="text-xs text-red-500 mt-1 ml-2">
                            {new Date(feedback.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Replies (from admins) */}
                      {feedback.replies && feedback.replies.length > 0 && (
                        <div className="space-y-4 ml-8">
                          {feedback.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-3 justify-end">
                              <div className="flex-1 flex justify-end">
                                <div className="max-w-full">
                                  <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl rounded-tr-sm px-4 py-3">
                                    <p className="text-sm text-white leading-relaxed">
                                      {reply.message}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 mt-1 mr-2">
                                    <p className="text-xs text-red-200">
                                      {new Date(reply.createdAt).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    <p className="text-xs font-semibold text-red-700">
                                      {reply.user?.name || 'Admin'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={reply.user?.avatar} />
                                <AvatarFallback className="text-xs font-semibold bg-purple-600 text-white">
                                  {reply.user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input for admins */}
                      {canEdit() && replyingToFeedback !== feedback.id && (
                        <div className="flex justify-end mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReplyingToFeedback(feedback.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Reply
                          </Button>
                        </div>
                      )}

                      {replyingToFeedback === feedback.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <form onSubmit={handleSubmitReply} className="space-y-3">
                            <div className="flex gap-3">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback className="text-xs font-semibold bg-gradient-to-r from-red-700 to-rose-700 text-white">
                                  {user?.name?.substring(0, 2).toUpperCase() || 'ME'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <Textarea
                                  placeholder="Type your reply..."
                                  value={replyMessage}
                                  onChange={(e) => setReplyMessage(e.target.value)}
                                  required
                                  rows={2}
                                  className="resize-none min-h-[60px] bg-white border-red-200/60 focus:border-red-500 focus:ring-red-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingToFeedback(null)
                                  setReplyMessage('')
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Reply
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Requests */}
        {canEdit() && (
          <TabsContent value="requests">
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No pending requests
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request: any) => (
                    <Card key={request.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.user?.avatar} />
                              <AvatarFallback className="text-sm">
                                {request.user?.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm sm:text-base">{request.user?.name}</p>
                              <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              onClick={() => handleJoinRequest(request.id, 'approve')}
                              className="flex-1 sm:flex-none h-10 min-h-[40px]"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleJoinRequest(request.id, 'reject')}
                              className="flex-1 sm:flex-none h-10 min-h-[40px]"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Members */}
        {canEdit() && (
          <TabsContent value="members">
            <div className="space-y-4">
              {org.members.length === 0 ? (
                <Card className="bg-gradient-to-br from-amber-50 to-rose-50 border-red-200/60">
                  <CardContent className="py-12 text-center text-red-700">
                    No members yet
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {org.members.map((member: any) => {
                    const isCurrentUser = member.userId === user?.id

                    return (
                      <Card key={member.id} className="bg-gradient-to-br from-amber-50 to-rose-50 border-red-200/60 shadow-sm">
                        <CardContent className="py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar>
                                <AvatarImage src={member.user?.avatar} />
                                <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 text-white">
                                  {member.user?.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm sm:text-base text-red-800">{member.user?.name}</p>
                                  {isCurrentUser && (
                                    <Badge variant="secondary" className="text-xs bg-gradient-to-r from-amber-100 to-rose-100 text-red-700 border-red-200">You</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs text-red-700 border-red-200">{member.role}</Badge>
                                </div>
                                <p className="text-sm text-red-600">{member.user?.email}</p>
                                {member.role !== 'Member' && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Switch
                                      id={`show-leaders-${member.id}`}
                                      checked={member.showInLeaders !== false}
                                      onCheckedChange={() => handleToggleShowInLeaders(member.userId, member.showInLeaders !== false)}
                                    />
                                    <Label
                                      htmlFor={`show-leaders-${member.id}`}
                                      className="text-xs text-red-600 cursor-pointer"
                                    >
                                      Show in Leaders
                                    </Label>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {!isCurrentUser && (
                                <>
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleChangeMemberRole(member.userId, value)}
                                  >
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="President">President</SelectItem>
                                      <SelectItem value="Vice President">Vice President</SelectItem>
                                      <SelectItem value="Secretary">Secretary</SelectItem>
                                      <SelectItem value="Treasurer">Treasurer</SelectItem>
                                      <SelectItem value="Admin">Org Admin</SelectItem>
                                      <SelectItem value="Member">Member</SelectItem>
                                      {/* Show custom role if it exists and is not predefined */}
                                      {!['President', 'Vice President', 'Secretary', 'Treasurer', 'Admin', 'Member', 'Other'].includes(member.role) && (
                                        <SelectItem value={member.role}>{member.role}</SelectItem>
                                      )}
                                      <SelectItem value="Other">Other...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="h-9 w-9"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* View Activity Dialog */}
      <Dialog open={viewActivityDialogOpen} onOpenChange={setViewActivityDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewingActivity?.title}</DialogTitle>
          </DialogHeader>
          {viewingActivity && (
            <div className="space-y-4">
              {viewingActivity.image && (
                <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={viewingActivity.image}
                    alt={viewingActivity.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(viewingActivity.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {viewingActivity.description}
                </p>
              </div>
              {canEdit() && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewActivityDialogOpen(false)
                      openActivityDialog(viewingActivity)
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Activity
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setViewActivityDialogOpen(false)
                      handleDeleteActivity(viewingActivity.id)
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Activity
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'New Activity'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveActivity} className="space-y-4">
            <div>
              <Label htmlFor="act-title">Title</Label>
              <Input
                id="act-title"
                value={activityForm.title}
                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="act-date">Date</Label>
              <Input
                id="act-date"
                type="date"
                value={activityForm.date}
                onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="act-desc">Description</Label>
              <Textarea
                id="act-desc"
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                required
              />
            </div>
            <ImageUpload
              label="Activity Image"
              currentImage={activityForm.image}
              onImageChange={(base64) => setActivityForm({ ...activityForm, image: base64 || '' })}
              className="mb-4"
            />
            <Button type="submit" className="w-full">
              {editingActivity ? 'Update' : 'Create'} Activity
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget Item' : 'New Budget Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <Label htmlFor="budget-category">Category</Label>
              <Input
                id="budget-category"
                value={budgetForm.category}
                onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget-allocated">Allocated ($)</Label>
                <Input
                  id="budget-allocated"
                  type="number"
                  min="0"
                  value={budgetForm.allocated}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocated: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="budget-limit">Limit ($)</Label>
                <Input
                  id="budget-limit"
                  type="number"
                  min="0"
                  value={budgetForm.limit}
                  onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingBudget ? 'Update' : 'Create'} Budget Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteActivityConfirm} onOpenChange={(open) => setDeleteActivityConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Activity Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteActivityConfirm?.activityTitle}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteActivity}>Delete Activity</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBudgetConfirm} onOpenChange={(open) => setDeleteBudgetConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Budget Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <span className="font-semibold">{deleteBudgetConfirm?.budgetCategory}</span> budget item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBudget}>Delete Budget</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removeMemberConfirm} onOpenChange={(open) => setRemoveMemberConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Member Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{removeMemberConfirm?.memberName}</span> from the organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember}>Remove Member</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Role Dialog */}
      <Dialog open={customRoleDialogOpen} onOpenChange={setCustomRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Custom Role</DialogTitle>
            <DialogDescription>
              Enter a custom role for this member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-role">Role Name</Label>
              <Input
                id="custom-role"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                placeholder="e.g., Event Coordinator, Tech Lead..."
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCustomRoleDialogOpen(false)
                  setCustomRoleInput('')
                  setCustomRoleForMember(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCustomRole} disabled={!customRoleInput.trim()}>
                Save Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => setRoleChangeConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <span className="font-semibold">{roleChangeConfirm?.userName}</span>'s role from{' '}
              <span className="font-semibold">{roleChangeConfirm?.currentRole}</span> to{' '}
              <span className="font-semibold">{roleChangeConfirm?.newRole}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Join Request Confirmation Dialog */}
      <AlertDialog open={!!joinRequestConfirm} onOpenChange={(open) => setJoinRequestConfirm(open ? null : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Join Request</AlertDialogTitle>
            <AlertDialogDescription>
              {joinRequestConfirm?.action === 'approve' ? (
                <>
                  Are you sure you want to approve <span className="font-semibold">{joinRequestConfirm?.userName}</span>'s join request for <span className="font-semibold">{org?.name}</span>?
                </>
              ) : (
                <>
                  Are you sure you want to reject <span className="font-semibold">{joinRequestConfirm?.userName}</span>'s join request for <span className="font-semibold">{org?.name}</span>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJoinRequest}>
              {joinRequestConfirm?.action === 'approve' ? 'Approve' : 'Reject'} Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Post Dialog */}
      <Dialog open={newPostDialogOpen} onOpenChange={setNewPostDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <Label htmlFor="post-content" className="text-base font-medium">Share something with the community</Label>
            <Textarea
              id="post-content"
              placeholder="Share something with the community..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              required
              rows={4}
              className="resize-none min-h-[120px] text-base"
            />
          </div>
          <ImageUpload
            label="Post Image"
            currentImage={newPostImage}
            onImageChange={(base64) => setNewPostImage(base64 || '')}
            className="mb-4"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewPostContent('')
                setNewPostImage('')
                setNewPostDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newPostContent.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Edit Post Dialog */}
    <Dialog open={newPostDialogOpen && editingPost !== null} onOpenChange={(open) => {
      if (!open) {
        setEditingPost(null)
        setNewPostDialogOpen(false)
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdatePost} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2">Content</label>
            <Textarea
              placeholder="What's on your mind?"
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div>
            <ImageUpload
              label="Image"
              currentImage={editPostImage}
              onImageChange={setEditPostImage}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingPost(null)
                setNewPostDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Delete Post Confirmation Dialog */}
    <AlertDialog open={deletePostConfirm?.open || false} onOpenChange={(open) => !open && setDeletePostConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeletePostConfirm(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeletePost}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Feedback Confirmation Dialog */}
    <AlertDialog open={deleteFeedbackConfirm?.open || false} onOpenChange={(open) => !open && setDeleteFeedbackConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the conversation with {deleteFeedbackConfirm?.userName}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteFeedbackConfirm(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteFeedback} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Post View Dialog */}
    <Dialog open={viewingPost !== null} onOpenChange={(open) => !open && setViewingPost(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
        {viewingPost && (
          <>
            <DialogHeader>
              <DialogTitle>Post</DialogTitle>
            </DialogHeader>

            {/* Post Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={viewingPost.author?.avatar} />
                  <AvatarFallback className="text-xs">
                    {viewingPost.author?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{viewingPost.author?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(viewingPost.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap break-words">
                {viewingPost.content}
              </p>

              {viewingPost.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={viewingPost.imageUrl}
                    alt="Post"
                    className="w-full max-h-[350px] object-cover"
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                {canEdit() && user?.role !== 'Admin' && (
                  <div className="flex gap-1 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditPost(viewingPost)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePost(viewingPost.id, viewingPost.content)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Budget & Collection Management Modal */}
    <Dialog open={budgetCollectionModalOpen} onOpenChange={setBudgetCollectionModalOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-5xl">
        <DialogHeader>
          <DialogTitle>Manage Budget & Collections</DialogTitle>
          <DialogDescription>
            Manage budget allocations and track student payments in one place
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeManagementTab} onValueChange={(v) => setActiveManagementTab(v as 'budget' | 'collection')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="budget">
              <DollarSign className="w-4 h-4 mr-2" />
              Budget Allocation
            </TabsTrigger>
            <TabsTrigger value="collection">
              <Users className="w-4 h-4 mr-2" />
              Collection Summary
            </TabsTrigger>
          </TabsList>

          {/* Budget Allocation Tab */}
          <TabsContent value="budget" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-rose-50">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totalBudget)}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-rose-50">
                <p className="text-sm text-muted-foreground">Allocated</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totalAllocated)}</p>
              </Card>
            </div>

            {/* Existing Budget Items */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">Budget Items</h3>
              <div className="space-y-3">
                {org.budgets.map((budget: any) => {
                  const utilization = budget.limit > 0 ? (budget.allocated / budget.limit) * 100 : 0
                  return (
                    <Card key={budget.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{budget.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(budget.allocated)} / {formatCurrency(budget.limit)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBudgetDialog(budget)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all"
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                    </Card>
                  )
                })}
                {org.budgets.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No budget items yet. Add one above.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Collection Summary Tab */}
          <TabsContent value="collection" className="space-y-6">
            {/* Numeric Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <Label htmlFor="total-students" className="text-sm font-semibold text-gray-700 mb-2">
                  Total Number of Students
                </Label>
                <Input
                  id="total-students"
                  type="number"
                  min="0"
                  value={totalStudentsInput}
                  onChange={(e) => setTotalStudentsInput(e.target.value)}
                  placeholder="0"
                  className="text-lg font-semibold"
                />
              </Card>

              <Card className="p-4">
                <Label htmlFor="paid-students" className="text-sm font-semibold text-green-700 mb-2">
                  Number of Paid Students
                </Label>
                <Input
                  id="paid-students"
                  type="number"
                  min="0"
                  max={totalStudentsInput}
                  value={paidStudentsInput}
                  onChange={(e) => setPaidStudentsInput(e.target.value)}
                  placeholder="0"
                  className="text-lg font-semibold"
                />
              </Card>

              <Card className="p-4 bg-gray-50">
                <Label className="text-sm font-semibold text-red-700 mb-2">
                  Number of Not Paid Students
                </Label>
                <div className="text-lg font-bold text-red-700 text-center py-2">
                  {notPaidStudents}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  (Auto-calculated: Total - Paid)
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-amber-50 to-rose-50">
                <Label htmlFor="student-fee" className="text-sm font-semibold text-red-700 mb-2">
                  Student fee (₱)
                </Label>
                <Input
                  id="student-fee"
                  type="number"
                  min="1"
                  value={studentFee}
                  onChange={(e) => setStudentFee(e.target.value)}
                  placeholder="150"
                  className="text-lg font-semibold"
                />
              </Card>
            </div>

            {/* Collection Summary Table */}
            <Card className="p-4">
              <h3 className="font-semibold text-red-700 mb-4">Collection Summary</h3>
              <div className="rounded-lg border border-red-200/60 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-red-50 to-rose-50">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-red-700">Description</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-red-700">Number of Students</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-red-700">Amount (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-red-200/50">
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">Total Students</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{totalStudents}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(totalAmount)}</td>
                    </tr>
                    <tr className="border-t border-red-200/50 bg-green-50/50">
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">Paid Students</td>
                      <td className="px-4 py-3 text-sm text-green-700 text-center font-semibold">{paidStudents}</td>
                      <td className="px-4 py-3 text-sm text-green-700 text-right font-semibold">{formatCurrency(paidAmount)}</td>
                    </tr>
                    <tr className="border-t border-red-200/50 bg-red-50/50">
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">Not Paid Students</td>
                      <td className="px-4 py-3 text-sm text-red-700 text-center font-semibold">{notPaidStudents}</td>
                      <td className="px-4 py-3 text-sm text-red-700 text-right font-semibold">{formatCurrency(notPaidAmount)}</td>
                    </tr>
                    <tr className="border-t-2 border-red-300 bg-gradient-to-r from-red-100 to-rose-100">
                      <td className="px-4 py-3 text-sm text-red-900 font-bold">Grand Total (Collected)</td>
                      <td className="px-4 py-3 text-sm text-red-900 text-center font-bold">{paidStudents}</td>
                      <td className="px-4 py-3 text-sm text-red-900 text-right font-bold">{formatCurrency(paidAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Student fee: ₱{studentFee} per student | Grand Total = Paid Students × ₱{studentFee}</p>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            onClick={handleSaveCollectionData}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}
