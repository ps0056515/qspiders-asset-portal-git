import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Package, PackagePlus, ArrowLeftRight,
  Wrench, BarChart3, Users, LogOut, Shield,
  ClipboardCheck, Sparkles
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
  { to: '/scan', label: 'AI Smart Scan', icon: Sparkles, roles: ['super_admin', 'ops_admin', 'center_head', 'center_staff'], highlight: true },
  { to: '/assets', label: 'Asset Register', icon: Package, roles: ['all'] },
  { to: '/assets/add', label: 'Add Asset', icon: PackagePlus, roles: ['super_admin', 'ops_admin', 'center_head', 'center_staff'] },
  { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight, roles: ['all'] },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['all'] },
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ['super_admin', 'ops_admin', 'center_head'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'ops_admin', 'auditor'] },
  { to: '/users', label: 'User Management', icon: Users, roles: ['super_admin'] },
]

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  ops_admin: 'Ops Admin',
  center_head: 'Center Head',
  center_staff: 'Center Staff',
  auditor: 'Auditor',
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  ops_admin: 'bg-blue-100 text-blue-700',
  center_head: 'bg-green-100 text-green-700',
  center_staff: 'bg-yellow-100 text-yellow-700',
  auditor: 'bg-gray-100 text-gray-700',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role)
  )

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-40 shadow-xl">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">QSpiders</p>
            <p className="text-xs text-slate-400 leading-tight">Asset Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate text-white">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.center_name}</p>
          </div>
        </div>
        <span className={`inline-block mt-2 ml-12 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user?.role]}`}>
          {ROLE_LABELS[user?.role]}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map(({ to, label, icon: Icon, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-sm'
                  : highlight
                  ? 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100 border border-purple-700/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {highlight && <span className="text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-semibold">AI</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
