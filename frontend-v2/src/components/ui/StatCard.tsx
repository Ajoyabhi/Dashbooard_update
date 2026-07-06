import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  change?: number
  icon: ReactNode
  iconBg?: string
  iconColor?: string
  className?: string
}

export default function StatCard({
  label, value, subValue, change, icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className={cn('stat-card group', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg',
            isPositive && 'text-emerald-700 bg-emerald-50',
            isNegative && 'text-red-600 bg-red-50',
            !isPositive && !isNegative && 'text-slate-500 bg-slate-100',
          )}>
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {!isPositive && !isNegative && <Minus size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      {subValue && <p className="text-xs text-slate-400 mt-1.5">{subValue}</p>}
    </div>
  )
}
