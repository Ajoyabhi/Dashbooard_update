import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Bell, Search, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/context/AuthContext'
import { Toaster } from 'react-hot-toast'

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) return 'Home'
  return segments[segments.length - 1]
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="relative h-full">
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-3 z-10 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 lg:hidden">
              <X size={16} />
            </button>
          )}
          <Sidebar />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 z-30">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden">
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-400 hidden sm:block capitalize">{user?.user_type}</span>
            <span className="text-slate-300 hidden sm:block">/</span>
            <h2 className="text-sm font-semibold text-slate-700 truncate">{getBreadcrumb(location.pathname)}</h2>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 w-52">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input type="text" placeholder="Search..."
                className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full" />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-lg bg-[#1A2744] flex items-center justify-center text-white text-xs font-semibold">
              {(user?.name || user?.user_name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '10px', background: '#1E293B', color: '#fff', fontSize: '14px' },
      }} />
    </div>
  )
}
