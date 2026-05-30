import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export function Spinner({ className = '' }: { className?: string }) {
  return <FontAwesomeIcon icon={faSpinner} spin className={className} />
}

export function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="card p-4 text-sm text-muted flex items-center gap-3">
      <Spinner className="text-accent" />
      <span>{text}</span>
    </div>
  )
}

export function LoadingInline({ text }: { text: string }) {
  return (
    <div className="text-muted text-sm flex items-center gap-2">
      <Spinner className="text-accent" />
      <span>{text}</span>
    </div>
  )
}
