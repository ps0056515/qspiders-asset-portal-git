import { useState } from 'react'
import { useMemo } from 'react'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useNavigate } from 'react-router-dom'

export default function TopBar({ title, onMobileMenuToggle }) {
  const { user } = useAuth()
  const { assets, transfers } = useData()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)

  const warrantyAlerts = useMemo(() => {
    return assets.filter(a => {
      if (!a.warranty_expiry) return false
      const days = Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 90 && days > 0
    }).map(a => ({
      asset_id: a.id,
      asset_name: a.asset_name,
      center: a.center_name,
      warranty_expiry: a.warranty_expiry,
      days_left: Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)),
    }))
  }, [assets])

  const pendingApprovals = assets.filter(a => a.status === 'Pending Decommission').length
    + transfers.filter(t => t.status === 'Pending Approval').length

  const notifCount = pendingApprovals + warrantyAlerts.length

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-semibold text-slate-800 text-sm">Notifications</p>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {pendingApprovals > 0 && (
                  <button
                    onClick={() => { navigate('/approvals'); setShowNotifs(false) }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-orange-600">⏳ {pendingApprovals} Pending Approval{pendingApprovals > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Deletion/transfer requests awaiting review</p>
                  </button>
                )}
                {warrantyAlerts.map((alert, i) => (
                  <div key={i} className="px-4 py-3 border-b border-slate-50">
                    <p className="text-sm font-medium text-amber-600">⚠️ Warranty expiring soon</p>
                    <p className="text-xs text-slate-600 mt-0.5">{alert.asset_name} — {alert.days_left} days left</p>
                    <p className="text-xs text-slate-400">{alert.center}</p>
                  </div>
                ))}
                {notifCount === 0 && !warrantyAlerts.length && (
                  <div className="px-4 py-6 text-center text-slate-400 text-sm">
                    All clear! No pending notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  )
}
