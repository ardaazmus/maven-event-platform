"use client"

// Wrapper around sonner to provide the same useToast API used across the app
import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}

function toast({ title, description, variant }: ToastOptions) {
  const type =
    variant === "destructive"
      ? "error"
      : variant === "success"
      ? "success"
      : variant === "warning"
      ? "warning"
      : variant === "info"
      ? "info"
      : undefined

  if (type) {
    sonnerToast[type as "error" | "success" | "warning" | "info"](title as string, {
      description: description as string,
    })
  } else {
    sonnerToast(title as string, {
      description: description as string,
    })
  }
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sonnerToast.dismiss(toastId)
      else sonnerToast.dismiss()
    },
    toasts: [] as any[],
  }
}

export { useToast, toast }
