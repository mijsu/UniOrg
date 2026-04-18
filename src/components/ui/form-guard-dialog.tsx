'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'

interface FormGuardDialogProps {
  open: boolean
  onDiscard: () => void
  onCancel: () => void
}

/**
 * Confirmation dialog shown when a user tries to close a form/dialog with unsaved changes.
 * Uses AlertDialog for a blocking modal pattern.
 */
export function FormGuardDialog({ open, onDiscard, onCancel }: FormGuardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. If you leave, your changes will be lost.
            Do you want to discard your changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep Editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
