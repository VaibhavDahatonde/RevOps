import { AlertCircle, X } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  onDismiss?: () => void
}

export default function ErrorMessage({ title = 'Error', message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h4 className="text-red-200 font-semibold mb-1">{title}</h4>
        <p className="text-red-200 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
