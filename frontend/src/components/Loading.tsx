import { LoaderCircle } from 'lucide-react'

export function Spinner({ className = '' }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`.trim()} size={20} strokeWidth={2} />
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
