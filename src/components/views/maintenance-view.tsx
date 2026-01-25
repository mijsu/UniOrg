import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MaintenanceViewProps {
  announcement?: string
}

export default function MaintenanceView({ announcement }: MaintenanceViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-rose-50/50 to-amber-50/50 p-4">
      <Card className="w-full max-w-2xl shadow-lg border-2 border-red-100">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-red-700">
            Under Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-lg sm:text-xl text-muted-foreground">
            The platform is currently undergoing maintenance. We apologize for the inconvenience and will be back shortly.
          </p>
          {announcement && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm sm:text-base text-amber-900 font-medium">
                Announcement:
              </p>
              <p className="text-sm sm:text-base text-amber-800 mt-2">
                {announcement}
              </p>
            </div>
          )}
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              For urgent matters, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
