export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-card border border-border rounded-xl ${hover ? 'hover:border-accent/50 transition-colors cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
