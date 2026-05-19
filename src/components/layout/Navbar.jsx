import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Target, Gamepad2, MessageSquare, Users, Trophy, Bell, LogOut, User, Settings, Menu, X, Home, Heart, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useUnreadStore } from '../../store/unreadStore'
import Avatar from '../ui/Avatar'

export default function Navbar() {
  const { user, profile, clear } = useAuthStore()
  const { total, friendRequests, teamJoinRequests } = useUnreadStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const navLinks = [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/games', icon: Gamepad2, label: 'Games' },
    { to: '/discover', icon: Heart, label: 'Discover' },
    { to: '/friends', icon: UserPlus, label: 'Friends', badge: friendRequests },
    { to: '/teams', icon: Users, label: 'Teams', badge: teamJoinRequests },
    { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', badge: total },
  ]

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false) }
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
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${active ? 'text-white bg-surface' : 'text-muted hover:text-slate-300 hover:bg-surface/60'}`}
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
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
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
                          <User size={13} /> View Profile
                        </Link>
                        <Link to="/profile/edit" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-surface rounded transition-colors">
                          <Settings size={13} /> Edit Profile
                        </Link>
                        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400/80 hover:text-red-400 hover:bg-surface rounded transition-colors">
                          <LogOut size={13} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-muted hover:text-white rounded transition-colors">
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3 py-1.5 text-xs font-medium text-muted hover:text-white transition-colors">Log In</Link>
              <Link to="/register" className="px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded transition-colors">Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card"
          >
            <div className="p-2">
              {navLinks.map(({ to, icon: Icon, label, badge }) => (
                <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${location.pathname.startsWith(to) ? 'text-white bg-surface' : 'text-muted hover:text-white hover:bg-surface'}`}
                >
                  <Icon size={16} />
                  {label}
                  {badge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
