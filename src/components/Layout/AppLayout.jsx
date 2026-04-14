import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useData } from '../../contexts/DataContext'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/scan': 'AI Smart Scan',
  '/assets': 'Asset Register',
  '/assets/add': 'Add New Asset',
  '/transfers': 'Transfer Management',
  '/maintenance': 'Maintenance Tracker',
  '/approvals': 'Pending Approvals',
  '/reports': 'Reports & Analytics',
  '/users': 'User Management',
}

export default function AppLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { loading, error, reload } = useData()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path) && path !== '/assets' || location.pathname === path
  )?.[1] || 'QSpiders Asset Portal'

  const pageTitle = location.pathname.startsWith('/assets/edit')
    ? 'Edit Asset'
    : location.pathname.startsWith('/assets/') && location.pathname !== '/assets/add'
    ? 'Asset Detail'
    : PAGE_TITLES[location.pathname] || 'QSpiders Asset Portal'

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <TopBar title={pageTitle} onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading data from database…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center max-w-md">
                <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
                <p className="font-semibold text-red-700 mb-1">Database connection error</p>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                  onClick={reload}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <RefreshCw size={15} />
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
