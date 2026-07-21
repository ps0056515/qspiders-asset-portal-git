import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useCenterFilter } from '../../contexts/CenterFilterContext'
import { CENTERS } from '../../lib/mockData'
import {
  LayoutDashboard, Package, BarChart3, Users,
  LogOut, Shield, Bell, Menu, X, ChevronDown
} from 'lucide-react'
import SectionPillBar, { isAssetsModulePath } from './SectionPillBar'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
  { to: '/assets', label: 'Assets', icon: Package, roles: ['all'], module: 'assets' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'ops_admin', 'auditor'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['super_admin'] },
]

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  ops_admin: 'Ops Admin',
  center_head: 'Center Head',
  center_staff: 'Center Staff',
  auditor: 'Auditor',
}

export default function TopNav() {
  const { user, logout } = useAuth()
  const { assets, transfers } = useData()
  const { selectedCenterId, setSelectedCenterId, locked } = useCenterFilter()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role)
  )

  const warrantyAlerts = useMemo(() => {
    return assets.filter(a => {
      if (!a.warranty_expiry) return false
      const days = Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 90 && days > 0
    }).map(a => ({
      asset_id: a.id,
      asset_name: a.asset_name,
      center: a.center_name,
      days_left: Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)),
    }))
  }, [assets])

  const pendingApprovals = assets.filter(a => a.status === 'Pending Decommission').length
    + transfers.filter(t => t.status === 'Pending Approval').length
  const notifCount = pendingApprovals + warrantyAlerts.length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const centerLabel = locked
    ? (user?.center_name || 'My Center')
    : selectedCenterId
      ? (CENTERS.find(c => c.id === selectedCenterId)?.name || selectedCenterId)
      : 'All Centers'

  const sectionHint = isAssetsModulePath(location.pathname)

  const isNavActive = (item) => {
    if (item.module === 'assets') return isAssetsModulePath(location.pathname)
    return location.pathname.startsWith(item.to)
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[var(--color-nav)] text-white border-b border-[var(--color-nav-border)]">
        <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="font-bold text-sm">QSpiders</p>
              <p className="text-[10px] text-violet-300">Asset Portal</p>
            </div>
          </div>

          {/* Center switcher */}
          <div className="relative shrink-0">
            {locked ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-800/50 text-sm text-violet-100 border border-violet-700/50">
                <span className="truncate max-w-40">{centerLabel}</span>
              </div>
            ) : (
              <label className="relative flex items-center">
                <select
                  value={selectedCenterId}
                  onChange={e => setSelectedCenterId(e.target.value)}
                  className="appearance-none bg-violet-800/50 border border-violet-700/50 text-violet-50 text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer max-w-48"
                >
                  <option value="">All Centers</option>
                  {CENTERS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 pointer-events-none text-violet-300" />
              </label>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
            {visibleItems.map((item) => {
              const { to, label, highlight } = item
              const active = isNavActive(item)
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard'}
                  className={() =>
                    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-violet-800 shadow-sm'
                        : 'text-violet-100 hover:bg-violet-800/60 hover:text-white'
                    }`
                  }
                >
                  {label}
                  {highlight && (
                    <span className="text-[10px] bg-violet-500/40 text-violet-100 px-1 py-0.5 rounded font-semibold">AI</span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div className="flex-1 lg:hidden" />

          {/* Utilities */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setNotifsOpen(v => !v)}
              className={`relative p-2 rounded-md transition ${notifsOpen ? 'bg-white text-violet-800' : 'text-violet-100 hover:bg-violet-800/60'}`}
              title="Notifications"
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-violet-700/60">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden xl:block leading-tight max-w-28">
                <p className="text-xs font-medium truncate">{user?.name}</p>
                <p className="text-[10px] text-violet-300 truncate">{ROLE_LABELS[user?.role]}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-md text-violet-200 hover:bg-red-500/20 hover:text-red-200 transition"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden p-2 rounded-md text-violet-100 hover:bg-violet-800/60"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* White pill secondary bar — section + tabs + function icons */}
        {sectionHint && <SectionPillBar />}
      </div>

      {/* Mobile nav — inline expand, no overlay backdrop */}
      {mobileOpen && (
        <nav className="lg:hidden bg-violet-950 border-b border-violet-800 px-3 py-2 space-y-0.5">
          {visibleItems.map((item) => {
            const { to, label, icon: Icon, highlight } = item
            const active = isNavActive(item)
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={() =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-white text-violet-800' : 'text-violet-100 hover:bg-violet-800/50'
                  }`
                }
              >
                <Icon size={16} />
                {label}
                {highlight && <span className="ml-auto text-[10px] bg-violet-500/40 px-1.5 py-0.5 rounded">AI</span>}
              </NavLink>
            )
          })}
        </nav>
      )}

      {/* Notifications strip — inline under nav, not a floating popup */}
      {notifsOpen && (
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 lg:px-6 py-3 max-w-5xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <button
                type="button"
                onClick={() => setNotifsOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {pendingApprovals > 0 && (
                <button
                  type="button"
                  onClick={() => { navigate('/approvals'); setNotifsOpen(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition"
                >
                  <p className="text-sm font-medium text-violet-700">
                    {pendingApprovals} Pending Approval{pendingApprovals > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Deletion/transfer requests awaiting review</p>
                </button>
              )}
              {warrantyAlerts.map((alert, i) => (
                <div key={i} className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm font-medium text-amber-700">Warranty expiring soon</p>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.asset_name} — {alert.days_left} days left</p>
                  <p className="text-xs text-slate-400">{alert.center}</p>
                </div>
              ))}
              {notifCount === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">All clear — no pending notifications.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
