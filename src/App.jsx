import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { CenterFilterProvider } from './contexts/CenterFilterContext'
import { ToolbarActionsProvider } from './contexts/ToolbarActionsContext'

import AppLayout from './components/Layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AssetRegisterPage from './pages/AssetRegisterPage'
import AssetDetailPage from './pages/AssetDetailPage'
import TransfersPage from './pages/TransfersPage'
import MaintenancePage from './pages/MaintenancePage'
import ApprovalsPage from './pages/ApprovalsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import ScanPage from './pages/ScanPage'

function EditAssetRedirect() {
  const { id } = useParams()
  return <Navigate to={`/assets?mode=edit&id=${encodeURIComponent(id || '')}`} replace />
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scan" element={
          <ProtectedRoute allowedRoles={['super_admin', 'ops_admin', 'center_head', 'center_staff']}>
            <ScanPage />
          </ProtectedRoute>
        } />
        <Route path="/assets" element={<AssetRegisterPage />} />
        <Route path="/assets/add" element={<Navigate to="/assets?mode=add" replace />} />
        <Route path="/assets/edit/:id" element={<EditAssetRedirect />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/approvals" element={
          <ProtectedRoute allowedRoles={['super_admin', 'ops_admin', 'center_head']}>
            <ApprovalsPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['super_admin', 'ops_admin', 'auditor']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <CenterFilterProvider>
            <ToolbarActionsProvider>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: { borderRadius: '10px', fontSize: '14px', fontWeight: '500' },
                  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
              />
            </ToolbarActionsProvider>
          </CenterFilterProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
