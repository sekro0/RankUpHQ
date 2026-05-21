import { usePresenceStore } from '../../store/presenceStore'

export default function Avatar({ src, name = '?', size = 'md', className = '', userId = null }) {
  const isOnline = usePresenceStore(s => userId ? s.isOnline(userId) : false)
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
  }
  const dotSizes = {
    xs: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
    sm: 'w-2.5 h-2.5 bottom-0 right-0 border-2',
    md: 'w-3 h-3 bottom-0 right-0 border-2',
    lg: 'w-4 h-4 bottom-0.5 right-0.5 border-2',
    xl: 'w-5 h-5 bottom-1 right-1 border-2'
  }
  const initials = name?.charAt(0)?.toUpperCase() || '?'

  const img = src
    ? <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-border ${userId ? '' : className}`} />
    : <div className={`${sizes[size]} rounded-full bg-accent/20 border-2 border-accent/30 flex items-center justify-center font-bold text-accent ${userId ? '' : className}`}>{initials}</div>

  if (userId) {
    return (
      <div className={`relative inline-flex shrink-0 ${className}`}>
        {img}
        {isOnline && (
          <span className={`absolute ${dotSizes[size]} bg-emerald-400 rounded-full border-bg ring-1 ring-emerald-400/20 z-10`} />
        )}
      </div>
    )
  }

  return img
}
