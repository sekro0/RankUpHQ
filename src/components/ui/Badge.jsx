export default function Badge({ children, color = 'default', className = '' }) {
  const colors = {
    default: 'text-muted bg-surface border-border',
    accent: 'text-accent bg-accent/10 border-accent/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    danger: 'text-red-400 bg-red-500/10 border-red-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}
