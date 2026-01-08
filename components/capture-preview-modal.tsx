'use client'

import { useEffect, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CapturePreviewModalProps {
  file: File | null
  isOpen: boolean
  onRetake: () => void
  onConfirm: () => void
  onClose: () => void
}

export function CapturePreviewModal({
  file,
  isOpen,
  onRetake,
  onConfirm,
  onClose,
}: CapturePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Cleanup on unmount or file change
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl('')
    }
  }, [file])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Review Photo</DialogTitle>
        </DialogHeader>

        {previewUrl && (
          <div className="relative w-full flex items-center justify-center bg-muted/50 rounded-md overflow-hidden">
            <img
              src={previewUrl}
              alt="Captured photo preview"
              className="max-h-[60vh] w-auto object-contain"
            />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRetake}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Retake Photo
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Use This Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
