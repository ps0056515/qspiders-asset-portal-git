import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import { useData } from '../../contexts/DataContext'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AppLayout() {
  const { loading, error, reload } = useData()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav />

      <main className="flex-1 p-4 lg:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-600 rounded-full animate-spin" />
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
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
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
  )
}
