import Spinner from './Spinner'

export default function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none'
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-surface hover:bg-[#1c1c26] text-slate-200 border border-border hover:border-[#2e2e3e]',
    ghost: 'text-muted hover:text-slate-200 hover:bg-surface',
    danger: 'bg-red-600/90 hover:bg-red-600 text-white',
    outline: 'border border-accent/60 text-accent hover:bg-accent hover:text-white hover:border-accent',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
