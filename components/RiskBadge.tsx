import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

interface RiskBadgeProps {
  riskScore: number | null
  riskLevel?: 'low' | 'medium' | 'high' | null
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
}

export default function RiskBadge({ riskScore, riskLevel, size = 'md', showScore = false }: RiskBadgeProps) {
  if (riskScore === null || riskScore === undefined) {
    return (
      <span className="text-xs text-gray-500">No score</span>
    )
  }

  // Determine level from score if not provided
  let level = riskLevel
  if (!level) {
    if (riskScore >= 61) level = 'high'
    else if (riskScore >= 31) level = 'medium'
    else level = 'low'
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const config = {
    low: {
      icon: CheckCircle,
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: 'text-green-200',
      label: 'Low Risk'
    },
    medium: {
      icon: AlertCircle,
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-200',
      label: 'Medium Risk'
    },
    high: {
      icon: AlertTriangle,
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-200',
      label: 'High Risk'
    }
  }

  const { icon: Icon, bg, border, text, label } = config[level]

  return (
    <span className={`inline-flex items-center gap-1.5 ${bg} ${border} border rounded-full ${sizes[size]} ${text} font-medium`}>
      <Icon className={iconSizes[size]} />
      <span>{showScore ? riskScore : label}</span>
    </span>
  )
}
