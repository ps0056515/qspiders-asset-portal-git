import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPS_ADMIN: 'ops_admin',
  CENTER_HEAD: 'center_head',
  CENTER_STAFF: 'center_staff',
  AUDITOR: 'auditor',
}

const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['all'],
  [ROLES.OPS_ADMIN]: ['view_all', 'edit_all', 'approve', 'reports', 'transfer', 'manage_maintenance'],
  [ROLES.CENTER_HEAD]: ['view_own', 'edit_own', 'request_delete', 'transfer_initiate', 'audit_own'],
  [ROLES.CENTER_STAFF]: ['view_own', 'add_asset', 'edit_own'],
  [ROLES.AUDITOR]: ['view_all', 'reports'],
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('qs_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data)
    localStorage.setItem('qs_user', JSON.stringify(data))
    return data
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('qs_user')
  }

  const can = (action) => {
    if (!user) return false
    const perms = PERMISSIONS[user.role] || []
    return perms.includes(action) || perms.includes('all')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, can, ROLES }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
