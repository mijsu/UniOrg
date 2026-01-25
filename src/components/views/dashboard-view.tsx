'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { GraduationCap, Users, Calendar, DollarSign, Search, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'

interface DashboardViewProps {
  setCurrentView: (view: any) => void
}

interface Organization {
  id: string
  name: string
  description: string
  logo?: string
  _count: {
    members: number
    activities: number
  }
  pendingRequests?: number
  isMember?: boolean
  canManage?: boolean // Added for OrgAdmin access control
}

interface Activity {
  id: string
  title: string
  date: string
  description: string
  image?: string
  organization?: {
    name: string
  }
}

export default function DashboardView({ setCurrentView }: DashboardViewProps) {
  const user = useAuthStore((state) => state.user)
  const setCurrentOrgId = useAppStore((state) => state.setCurrentOrgId)
  const clearAppStore = useAppStore((state) => state.clear)
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'members' | 'activities'>('all')
  const [memberJoinConfirm, setMemberJoinConfirm] = useState<{ open: boolean; orgId: string; orgName: string } | null>(null)
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [requestingOrgs, setRequestingOrgs] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Don't load data if user is not logged in
    if (!user?.id) {
      setLoading(false)
      setOrgs([])
      setUpcomingActivities([])
      setMyRequests([])
      return
    }

    loadOrganizations()
  }, [user?.id]) // Only trigger when user.id changes, not on every user object change

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const loadOrganizations = async () => {
    // Early return if user is not available (logout scenario)
    if (!user?.id) {
      setLoading(false)
      setOrgs([])
      setUpcomingActivities([])
      setMyRequests([])
      return
    }

    setLoading(true)
    try {
      if (user?.role === 'Admin') {
        setCurrentView('admin-dashboard')
        return
      }

      if (user?.role === 'OrgAdmin') {
        // Fetch ALL organizations (not just managed ones)
        const allOrgsResponse = await fetch('/api/organizations')
        const allOrgsData = await allOrgsResponse.json()

        // Fetch user's managed organizations to determine access level
        const managedOrgsResponse = await fetch(`/api/organizations?userId=${user.id}`)
        const managedOrgsData = await managedOrgsResponse.json()
        const managedOrgIds = (managedOrgsData.organizations || []).map((org: any) => org.id)

        // Mark organizations with access level
        setOrgs((allOrgsData.organizations || []).map((org: any) => ({
          ...org,
          isMember: managedOrgIds.includes(org.id),
          canManage: managedOrgIds.includes(org.id),
        })))
      } else {
        // Students: Fetch ALL organizations to discover and join
        const response = await fetch('/api/organizations')
        const data = await response.json()
        setOrgs(data.organizations || [])

        // Also fetch organizations user is already a member of
        const memberResponse = await fetch(`/api/organizations?userId=${user.id}`)
        const memberData = await memberResponse.json()
        const memberOrgIds = (memberData.organizations || []).map((org: any) => org.id)

        // Mark joined organizations
        setOrgs((prev) =>
          prev.map((org) => ({
            ...org,
            isMember: memberOrgIds.includes(org.id),
          }))
        )

        // Load upcoming activities from joined organizations
        if (memberOrgIds.length > 0) {
          try {
            const activityPromises = memberOrgIds.map((orgId) =>
              fetch(`/api/activities?orgId=${orgId}`)
            )
            const activityResponses = await Promise.all(activityPromises)
            const activityData = await Promise.all(activityResponses.map((r) => r.json()))

            const allActivities = activityData
              .flatMap((data) => data.activities || [])
              .filter((activity: any) => new Date(activity.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Include last 7 days of activities
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 6) // Show next 6 activities

            setUpcomingActivities(allActivities)
          } catch (error) {
            console.error('Failed to load activities:', error)
          }
        }

        // Load user's join requests
        if (user?.id) {
          try {
            const requestsResponse = await fetch(`/api/requests?userId=${user.id}`)
            const requestsData = await requestsResponse.json()
            setMyRequests(requestsData.requests || [])
          } catch (error) {
            console.error('Failed to load requests:', error)
          }
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load organizations',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrg = (orgId: string) => {
    setCurrentOrgId(orgId)
    setCurrentView('org-hub')
  }

  const handleRequestJoin = async (orgId: string) => {
    // Prevent multiple requests for the same organization
    if (isRequesting(orgId) || hasPendingRequest(orgId)) {
      return
    }

    // Check if user is already a member of an organization
    const hasExistingMembership = myJoinedOrganizations.length > 0

    if (hasExistingMembership) {
      const existingOrg = myJoinedOrganizations[0]
      const targetOrg = orgs.find((o) => o.id === orgId)
      setMemberJoinConfirm({
        open: true,
        orgId,
        orgName: targetOrg?.name || 'this organization',
      })
    } else {
      // Proceed with join request
      submitJoinRequest(orgId)
    }
  }

  const submitJoinRequest = async (orgId: string) => {
    try {
      // Add orgId to requesting set
      setRequestingOrgs((prev) => new Set(prev).add(orgId))

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Request sent!',
          description: 'Your join request has been submitted.',
        })
        loadOrganizations()
      } else {
        const error = data.error || 'Failed to send request'
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error,
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      })
    } finally {
      // Remove orgId from requesting set
      setRequestingOrgs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orgId)
        return newSet
      })
    }
  }

  const getFilteredOrganizations = () => {
    let filtered = orgs

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(query) ||
        org.description.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (filterBy === 'members') {
      filtered = filtered.filter((org) => org._count.members > 50)
    } else if (filterBy === 'activities') {
      filtered = filtered.filter((org) => org._count.activities > 5)
    }

    return filtered
  }

  const myJoinedOrganizations = orgs.filter((org) => {
    if (user?.role === 'OrgAdmin') {
      // For OrgAdmins, show organizations they can manage
      return (org as any).canManage
    }
    // For Students, show organizations they're members of
    return (org as any).isMember
  })

  const getDaysUntil = (date: string) => {
    const activityDate = new Date(date)
    const today = new Date()
    // Reset time part to compare only dates
    activityDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffTime = activityDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Check if user has already requested to join an organization
  const hasPendingRequest = (orgId: string) => {
    return myRequests.some(
      (request: any) => request.orgId === orgId && request.status === 'pending'
    )
  }

  const isRequesting = (orgId: string) => {
    return requestingOrgs.has(orgId)
  }

  if (loading) {
    return (
      <div className="container py-6 sm:py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48 sm:w-64" />
          <div className="h-32 sm:h-48 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const filteredOrgs = getFilteredOrganizations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-red-50/30 to-rose-50/30 py-6 sm:py-8 px-4 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-br from-red-800 via-rose-900 to-red-950 border-0 shadow-xl overflow-hidden relative">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="py-6 sm:py-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white drop-shadow-sm">
                {getGreeting()}, {user?.name}!
              </h1>
              <p className="text-sm sm:text-base text-white/90">
                {myJoinedOrganizations.length > 0
                  ? user?.role === 'OrgAdmin'
                    ? `You manage ${myJoinedOrganizations.length} organization${myJoinedOrganizations.length !== 1 ? 's' : ''}. View and manage others below!`
                    : `You're a member of ${myJoinedOrganizations.length} organization${myJoinedOrganizations.length !== 1 ? 's' : ''}. Explore and join more!`
                  : user?.role === 'OrgAdmin'
                    ? 'Discover organizations to manage or view'
                    : 'Discover organizations to join. You can be a member of multiple organizations!'}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Badge className="bg-white/20 text-white border-white/30 text-sm font-semibold backdrop-blur-sm">
                {user?.role === 'Admin' ? 'System Administrator' : user?.role === 'OrgAdmin' ? 'Org Admin' : 'Student'}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-sm font-semibold backdrop-blur-sm">
                {myJoinedOrganizations.length} Joined
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner for Non-Members */}
      {!user || user.role === 'Student' && myJoinedOrganizations.length === 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Search className="w-5 h-5 text-amber-700 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                Explore Organizations
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                You can view details of any organization below, including activities, members, and posts. Join the ones that interest you!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities */}
      {upcomingActivities.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-red-500/10 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-500/10 to-rose-500/10 pb-4 border-b border-red-100">
            <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
              <Calendar className="w-5 h-5 text-red-600" />
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingActivities.map((activity: any) => {
                const daysUntil = getDaysUntil(activity.date)
                return (
                  <div
                    key={activity.id}
                    className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200/60 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer"
                    onClick={() => {
                      setCurrentOrgId(activity.orgId)
                      setCurrentView('org-hub')
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Logo/Image on the left */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden shadow-md ring-2 ring-indigo-100 flex-shrink-0 bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                        {activity.image ? (
                          <img src={activity.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Calendar className="w-10 h-10 text-red-600" />
                        )}
                      </div>

                      {/* Content on the right */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        {/* Date badge on top right */}
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-1 text-gray-800 pr-2">{activity.title}</h3>
                          <Badge className={`text-xs font-medium flex-shrink-0 ${
                            daysUntil === 0
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-0'
                              : daysUntil > 0 && daysUntil <= 3
                              ? 'bg-orange-100 text-orange-700 border-orange-300'
                              : daysUntil < 0
                              ? 'bg-gray-200 text-gray-600 border-gray-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}>
                            {daysUntil === 0 ? (
                              <span className="font-semibold">Today</span>
                            ) : daysUntil === 1 ? (
                              'Tomorrow'
                            ) : daysUntil > 0 ? (
                              `${daysUntil}d left`
                            ) : daysUntil === -1 ? (
                              'Yesterday'
                            ) : (
                              `${Math.abs(daysUntil)}d ago`
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 flex-1">{activity.description}</p>
                        {activity.organization && (
                          <p className="text-xs text-red-600 font-semibold mt-1">{activity.organization.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Memberships */}
      {myJoinedOrganizations.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-rose-500/10 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 to-red-500/10 pb-4 border-b border-rose-100">
            <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-transparent">
              <Users className="w-5 h-5 text-rose-600" />
              {user?.role === 'OrgAdmin' ? 'My Managed Organizations' : 'My Memberships'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myJoinedOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="p-4 bg-gradient-to-br from-white to-rose-50/30 rounded-xl border border-rose-200/60 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/15 transition-all cursor-pointer group"
                  onClick={() => handleViewOrg(org.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-md ring-2 ring-purple-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-red-100">
                          <GraduationCap className="w-6 h-6 text-rose-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-1 text-gray-800">{org.name}</h3>
                      <p className="text-xs text-gray-600 line-clamp-1">{org.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-700">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-rose-600" />
                      <span className="font-medium">{org._count.members} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-600" />
                      <span className="font-medium">{org._count.activities} activities</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discover Organizations */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
              Discover Organizations
            </h2>
            <p className="text-sm text-gray-600">
              Explore {orgs.length} organization{orgs.length !== 1 ? 's' : ''} {user?.role === 'OrgAdmin' ? '' : 'available to join'}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 sm:h-12 w-full bg-white border-red-200 focus:border-red-500 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2 w-full overflow-x-auto overflow-y-hidden">
            <Button
              variant={filterBy === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterBy('all')}
              className="h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-800 hover:to-rose-800 border-0 shadow-md shadow-red-500/20 flex-shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">All</span>
              <span className="sm:hidden">All Orgs</span>
            </Button>
            <Button
              variant={filterBy === 'members' ? 'default' : 'outline'}
              onClick={() => setFilterBy('members')}
              className="h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base bg-white border-red-200 text-red-700 hover:border-red-300 hover:bg-indigo-50 flex-shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Popular</span>
              <span className="sm:hidden">Trending</span>
            </Button>
            <Button
              variant={filterBy === 'activities' ? 'default' : 'outline'}
              onClick={() => setFilterBy('activities')}
              className="h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base bg-white border-red-200 text-red-700 hover:border-red-300 hover:bg-indigo-50 flex-shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Active</span>
              <span className="sm:hidden">Recent</span>
            </Button>
          </div>
        </div>

        {/* Organization Cards */}
        {filteredOrgs.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
            <CardContent className="py-12 sm:py-16 text-center">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-red-400" />
              <p className="text-sm sm:text-base text-gray-600">
                No organizations match your search.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
            {filteredOrgs.map((org) => (
              <Card key={org.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl hover:shadow-red-500/15 transition-all group overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-red-50/50 to-rose-50/50 text-center pb-4 border-b border-red-100/50">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-xl overflow-hidden bg-white shadow-lg ring-2 ring-indigo-100 relative group-hover:scale-105 transition-transform">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-100 to-rose-100">
                        <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg flex items-center justify-center gap-2 text-gray-800">
                    {org.name}
                    {user?.role === 'OrgAdmin' && !(org as any).canManage && (
                      <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                        View Only
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm text-gray-600">
                    {org.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end space-y-3 sm:space-y-4">
                  <div className="flex justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-red-600" />
                      <span className="font-medium">{org._count.members} Members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-medium">{org._count.activities} Activities</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {user?.role === 'Student' ? (
                      <>
                        {(org as any).isMember ? (
                          <>
                            <Button
                              className="w-full sm:flex-1 h-11 min-h-[44px] bg-gradient-to-r from-emerald-500 to-green-500 border-0 shadow-md disabled:opacity-50"
                              disabled
                            >
                              ✓ Member
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewOrg(org.id)}
                              className="w-full sm:flex-1 h-11 min-h-[44px] border-red-300 text-red-700 hover:bg-indigo-50"
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </>
                        ) : hasPendingRequest(org.id) ? (
                          <>
                            <Button
                              className="w-full sm:flex-1 h-11 min-h-[44px] bg-gray-100 border-gray-300 text-gray-600 border-0"
                              disabled
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Pending
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewOrg(org.id)}
                              className="w-full sm:flex-1 h-11 min-h-[44px] border-red-300 text-red-700 hover:bg-indigo-50"
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              className="w-full sm:flex-1 h-11 min-h-[44px] bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-800 hover:to-rose-800 border-0 shadow-md shadow-red-500/20"
                              onClick={() => handleRequestJoin(org.id)}
                              disabled={isRequesting(org.id)}
                            >
                              {isRequesting(org.id) ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                  Sending...
                                </>
                              ) : (
                                'Request to Join'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewOrg(org.id)}
                              className="w-full sm:flex-1 h-11 min-h-[44px] border-red-300 text-red-700 hover:bg-indigo-50"
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </>
                        )}
                      </>
                    ) : user?.role === 'OrgAdmin' ? (
                      <>
                        {(org as any).canManage ? (
                          <Button
                            className="w-full sm:flex-1 h-11 min-h-[44px]"
                            onClick={() => handleViewOrg(org.id)}
                          >
                            Manage Organization
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                  </div>

                  {org.pendingRequests && org.pendingRequests > 0 && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      <Badge variant="default" className="animate-pulse text-xs">
                        {org.pendingRequests} New
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Member Join Confirmation Dialog */}
      {memberJoinConfirm && (
        <AlertDialog open={memberJoinConfirm.open} onOpenChange={(open) => setMemberJoinConfirm(open ? null : undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                Join Another Organization
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="text-base space-y-3 pt-2 px-6 pb-4">
              <div>
                You are currently a member of <span className="font-semibold text-foreground">{myJoinedOrganizations.length === 1 ? myJoinedOrganizations[0]?.name : `${myJoinedOrganizations.length} organizations`}</span>.
              </div>
              <div className="text-muted-foreground">
                Good news! You can join multiple organizations. Your existing memberships and permissions will remain unchanged.
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <span className="font-semibold">Note:</span> You can view details of any organization, whether you're a member or not.
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberJoinConfirm(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setMemberJoinConfirm(null)
                  submitJoinRequest(memberJoinConfirm.orgId)
                }}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-800 hover:to-rose-800"
              >
                Request to Join
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
