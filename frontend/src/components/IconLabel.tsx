import type { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export function IconLabel({
  icon,
  children,
  className = '',
}: {
  icon: IconDefinition
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FontAwesomeIcon icon={icon} />
      <span>{children}</span>
    </span>
  )
}
