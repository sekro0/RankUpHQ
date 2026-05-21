import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Target, Gamepad2, MessageSquare, Users, Trophy, LogOut, User, Settings, Home, Heart, UserPlus, Globe, Search, BarChart2, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useUnreadStore } from '../../store/unreadStore'
import { useT } from '../../store/langStore'
import Avatar from '../ui/Avatar'
import NotificationPanel from '../NotificationPanel'

const LANG_OPTIONS = [
  { code: 'es', label: 'ES', full: 'Español' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'pt', label: 'PT', full: 'Português' },
]

export default function Navbar() {
  const { user, profile, clear } = useAuthStore()
  const { total, friendRequests, teamJoinRequests } = useUnreadStore()
  const { t, lang, setLang } = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const langRef = useRef(null)
  const moreRef = useRef(null)

  const navLinks = [
    { to: '/dashboard', icon: Home, label: t('home') },
    { to: '/games', icon: Gamepad2, label: t('games') },
    { to: '/discover', icon: Heart, label: t('discover') },
    { to: '/friends', icon: UserPlus, label: t('friends'), badge: friendRequests },
    { to: '/teams', icon: Users, label: t('teams'), badge: teamJoinRequests },
    { to: '/tournaments', icon: Trophy, label: t('tournaments') },
    { to: '/leaderboard', icon: BarChart2, label: t('leaderboard') },
    { to: '/messages', icon: MessageSquare, label: t('messages'), badge: total },
  ]

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangMenuOpen(false)
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clear()
    navigate('/')
    toast.success('Signed out')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-bg border-b border-border h-14">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <Target size={14} className="text-white" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">RankUp<span className="text-accent">HQ</span></span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {navLinks.map(({ to, icon: Icon, label, badge }) => {
              const active = location.pathname.startsWith(to)
              const isMoreLink = to === '/tournaments' || to === '/leaderboard'
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isMoreLink ? 'hidden lg:flex' : ''} ${active ? 'text-white bg-surface' : 'text-muted hover:text-slate-300 hover:bg-surface/60'}`}
                >
                  <Icon size={14} />
                  {label}
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
            {/* More dropdown (md only, hides at lg) */}
            <div className="relative lg:hidden" ref={moreRef}>
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  (location.pathname.startsWith('/tournaments') || location.pathname.startsWith('/leaderboard')) ? 'text-white bg-surface' : 'text-muted hover:text-slate-300 hover:bg-surface/60'
                }`}
              >
                <MoreHorizontal size={14} /> More
              </button>
              <AnimatePresence>
                {moreMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                  >
                    {[{ to: '/tournaments', icon: Trophy, label: t('tournaments') }, { to: '/leaderboard', icon: BarChart2, label: t('leaderboard') }].map(({ to, icon: Icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMoreMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${location.pathname.startsWith(to) ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-white hover:bg-surface'}`}
                      >
                        <Icon size={13} /> {label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-muted hover:text-white hover:bg-surface transition-colors"
            >
              <Globe size={13} />
              <span className="hidden sm:block">{lang.toUpperCase()}</span>
            </button>
            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-32 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                >
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => { setLang(opt.code); setLangMenuOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${lang === opt.code ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-white hover:bg-surface'}`}
                    >
                      <span>{opt.full}</span>
                      <span className="font-bold">{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <>
              <NotificationPanel />
              <Link to="/search" className="p-1.5 text-muted hover:text-white hover:bg-surface rounded transition-colors">
                <Search size={15} />
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface transition-colors">
                  <Avatar src={profile?.avatar_url} name={profile?.username || profile?.display_name} size="sm" />
                  <span className="hidden md:block text-xs font-medium text-slate-400">{profile?.username || 'Player'}</span>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                    >
                      <div className="px-3 py-2.5 border-b border-border">
                        <p className="text-xs font-semibold text-white">{profile?.display_name || profile?.username}</p>
                        <p className="text-[11px] text-muted mt-0.5">@{profile?.username}</p>
                      </div>
                      <div className="p-1">
                        <Link to={`/profile/${profile?.username}`} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-surface rounded transition-colors">
                          <User size={13} /> {t('view_profile')}
                        </Link>
                        <Link to="/profile/edit" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-surface rounded transition-colors">
                          <Settings size={13} /> {t('edit_profile')}
                        </Link>
                        <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-surface rounded transition-colors">
                          <Settings size={13} /> {t('settings')}
                        </Link>
                        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400/80 hover:text-red-400 hover:bg-surface rounded transition-colors">
                          <LogOut size={13} /> {t('sign_out')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3 py-1.5 text-xs font-medium text-muted hover:text-white transition-colors">{t('log_in')}</Link>
              <Link to="/register" className="px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded transition-colors">{t('sign_up')}</Link>
            </div>
          )}
        </div>
      </div>

    </nav>
  )
}
