import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function IconLabel({
  icon,
  children,
  className = '',
}: {
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  const Icon = icon
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Icon size={16} strokeWidth={2} />
      <span>{children}</span>
    </span>
  )
}
