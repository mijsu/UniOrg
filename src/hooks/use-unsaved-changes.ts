'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook to track whether form data has been modified since a dialog was opened.
 * Snapshots the form state when `isOpen` becomes true, then compares current state to snapshot.
 *
 * @param formData - The current form state object (must be JSON-serializable)
 * @param isOpen - Whether the dialog is currently open
 * @returns `{ isDirty }` — true if form has been modified since dialog opened
 */
export function useUnsavedChanges<T extends Record<string, any>>(
  formData: T,
  isOpen: boolean
) {
  const [initialData, setInitialData] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Deep-clone the current form state as the baseline
      setInitialData(JSON.stringify(formData))
    } else {
      setInitialData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const isDirty = initialData !== null && JSON.stringify(formData) !== initialData

  return { isDirty }
}

/**
 * Hook that provides a shared interceptClose mechanism for multiple dialogs in one view.
 * When a dialog with dirty state tries to close, it shows a confirmation alert instead.
 *
 * @returns `{ formGuardOpen, discardCallback, interceptClose, confirmDiscard, cancelDiscard }`
 */
export function useFormGuard() {
  const [formGuardOpen, setFormGuardOpen] = useState(false)
  const discardCallbackRef = useRef<(() => void) | null>(null)

  const interceptClose = useCallback((isDirty: boolean, closeAction: () => void) => {
    if (isDirty) {
      discardCallbackRef.current = closeAction
      setFormGuardOpen(true)
    } else {
      closeAction()
    }
  }, [])

  const confirmDiscard = useCallback(() => {
    if (discardCallbackRef.current) {
      discardCallbackRef.current()
      discardCallbackRef.current = null
    }
    setFormGuardOpen(false)
  }, [])

  const cancelDiscard = useCallback(() => {
    discardCallbackRef.current = null
    setFormGuardOpen(false)
  }, [])

  return {
    formGuardOpen,
    interceptClose,
    confirmDiscard,
    cancelDiscard,
  }
}

/**
 * Hook for inline forms (not dialogs) — adds a beforeunload listener when form is dirty.
 *
 * @param isDirty - Whether the form has unsaved changes
 */
export function useBeforeUnloadGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers require returnValue to be set
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
