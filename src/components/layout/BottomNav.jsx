import { Link, useLocation } from 'react-router-dom'
import { Home, Gamepad2, Heart, MessageSquare, MoreHorizontal, Users, Trophy, UserPlus, BarChart2, Search, Settings, Bell } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUnreadStore } from '../../store/unreadStore'
import { useT } from '../../store/langStore'

const PRIMARY = [
  { to: '/dashboard', icon: Home, labelKey: 'home' },
  { to: '/games', icon: Gamepad2, labelKey: 'games' },
  { to: '/discover', icon: Heart, labelKey: 'discover' },
  { to: '/messages', icon: MessageSquare, labelKey: 'messages', badgeKey: 'total' },
]

export default function BottomNav() {
  const location = useLocation()
  const { t } = useT()
  const { total, friendRequests, teamJoinRequests, teamInvites } = useUnreadStore()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  if (location.pathname.match(/^\/messages\/.+/)) return null

  const badgeMap = { total, friendRequests, teamJoinRequests }

  const notifBadge = friendRequests + teamJoinRequests + teamInvites + (total > 0 ? 1 : 0)

  const MORE_LINKS = [
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: notifBadge },
    { to: '/friends', icon: UserPlus, label: t('friends'), badge: friendRequests },
    { to: '/teams', icon: Users, label: t('teams'), badge: teamJoinRequests },
    { to: '/tournaments', icon: Trophy, label: t('tournaments') },
    { to: '/leaderboard', icon: BarChart2, label: t('leaderboard') },
    { to: '/search', icon: Search, label: t('search') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ]

  useEffect(() => {
    const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const moreBadge = friendRequests + teamJoinRequests

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border h-14 flex items-stretch">
      {PRIMARY.map(({ to, icon: Icon, labelKey, badgeKey }) => {
        const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
        const badge = badgeKey ? badgeMap[badgeKey] : 0
        return (
          <Link key={to} to={to}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-accent' : 'text-muted'}`}>
            <Icon size={20} />
            <span className="text-[9px] font-medium">{t(labelKey)}</span>
            {badge > 0 && (
              <span className="absolute top-1.5 right-1/4 min-w-[14px] h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
      <div ref={moreRef} className="relative flex-1 flex flex-col items-center justify-center">
        <button onClick={() => setMoreOpen(v => !v)}
          className={`relative flex flex-col items-center gap-0.5 w-full h-full justify-center transition-colors ${moreOpen ? 'text-accent' : 'text-muted'}`}>
          <MoreHorizontal size={20} />
          <span className="text-[9px] font-medium">More</span>
          {moreBadge > 0 && (
            <span className="absolute top-1.5 right-1/4 min-w-[14px] h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
              {moreBadge > 99 ? '99+' : moreBadge}
            </span>
          )}
        </button>
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full right-0 mb-1 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
            >
              {MORE_LINKS.map(({ to, icon: Icon, label, badge }) => {
                const active = location.pathname.startsWith(to)
                return (
                  <Link key={to} to={to} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${active ? 'text-accent bg-accent/5' : 'text-slate-300 hover:text-white hover:bg-surface'}`}>
                    <Icon size={15} />
                    {label}
                    {badge > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
