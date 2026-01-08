'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  disabled?: boolean
}

export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
    }
    // Reset input value to allow same file selection twice
    e.target.value = ''
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="flex items-center gap-2"
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label="Capture photo with camera"
      >
        <Camera className="h-5 w-5" />
        <span className="hidden sm:inline">Take Photo</span>
        <span className="sm:hidden">Camera</span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  )
}
