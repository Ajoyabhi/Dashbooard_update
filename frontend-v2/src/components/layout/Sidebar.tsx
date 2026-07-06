import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCog, ArrowUpCircle, Layers, Landmark,
  BadgeCheck, TrendingDown, TrendingUp, Wallet, RotateCcw, FileX,
  Trash2, AlertCircle, History, Code2, BookOpen, LogOut, User,
  KeyRound, ChevronRight, Shield, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { adminMenu, userMenu, agentMenu, NavItem } from '@/utils/menuItems'
import toast from 'react-hot-toast'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Users, UserCog, ArrowUpCircle, Layers, Landmark,
  BadgeCheck, TrendingDown, TrendingUp, Wallet, RotateCcw, FileX,
  Trash2, AlertCircle, History, Code2, BookOpen, Shield,
}

function NavGroup({ section, items }: { section: string; items: NavItem[] }) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400/70">
        {section}
      </p>
      {items.map((item) => {
        const Icon = iconMap[item.icon] || LayoutDashboard
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 2}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            <ChevronRight size={12} className="ml-auto opacity-40" />
          </NavLink>
        )
      })}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuByRole: Record<string, NavItem[]> = {
    admin: adminMenu, agent: agentMenu, user: userMenu, payin_payout: userMenu,
  }
  const menu = menuByRole[user?.user_type || ''] || userMenu
  const sections = [...new Set(menu.map((i) => i.section || 'General'))]

  const handleLogout = () => {
    toast.success('Logged out successfully')
    setTimeout(() => logout(), 500)
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-[#1A2744] text-white select-none">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C43A] flex items-center justify-center shadow-lg">
            <Shield size={18} className="text-[#1A2744]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">Shrivatsam</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Payment Gateway</p>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
            <User size={13} className="text-[#D4AF37]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || user?.user_name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.user_type}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {sections.map((section) => (
          <NavGroup key={section} section={section}
            items={menu.filter((i) => (i.section || 'General') === section)} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
        <button onClick={() => navigate('/profile')} className="sidebar-link sidebar-link-inactive w-full">
          <User size={16} /><span>Profile</span>
        </button>
        <button onClick={() => navigate('/change-password')} className="sidebar-link sidebar-link-inactive w-full">
          <KeyRound size={16} /><span>Change Password</span>
        </button>
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
