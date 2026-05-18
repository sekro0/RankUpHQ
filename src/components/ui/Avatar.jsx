export default function Avatar({ src, name = '?', size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl', xl: 'w-24 h-24 text-3xl' }
  const initials = name?.charAt(0)?.toUpperCase() || '?'
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-border ${className}`} />
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-accent/20 border-2 border-accent/30 flex items-center justify-center font-bold text-accent ${className}`}>
      {initials}
    </div>
  )
}
