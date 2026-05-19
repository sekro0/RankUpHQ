import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 pb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${
                variant === 'danger' ? 'bg-red-500/15' : 'bg-yellow-500/15'
              }`}>
                <AlertTriangle size={20} className={variant === 'danger' ? 'text-red-400' : 'text-yellow-400'} />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{message}</p>
            </div>
            <div className="flex border-t border-border">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-medium text-muted hover:text-white hover:bg-surface transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-3 text-sm font-semibold border-l border-border transition-colors disabled:opacity-40 flex items-center justify-center gap-2 ${
                  variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300'
                }`}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
