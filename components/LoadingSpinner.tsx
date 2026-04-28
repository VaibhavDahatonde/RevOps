import { RefreshCw } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <RefreshCw className={`${sizeClasses[size]} text-purple-400 animate-spin mb-3`} />
      <p className="text-gray-400">{message}</p>
    </div>
  )
}
