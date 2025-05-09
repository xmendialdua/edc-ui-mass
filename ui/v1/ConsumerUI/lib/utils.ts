import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // Convert milliseconds to seconds
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) {
    return "just now"
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }

  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months}mo ago`
  }

  const years = Math.floor(months / 12)
  return `${years}y ago`
}

// Format a timestamp as a full date string
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

