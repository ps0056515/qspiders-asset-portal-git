import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'

const DEMO_USERS = [
  { id: '1', name: 'Rajesh Kumar',  email: 'superadmin@qspiders.com', password: 'admin123', role: 'super_admin' },
  { id: '2', name: 'Priya Sharma',  email: 'opsadmin@qspiders.com',   password: 'ops123',   role: 'ops_admin' },
  { id: '3', name: 'Arun Nair',     email: 'centerhead@qspiders.com', password: 'head123',  role: 'center_head' },
  { id: '4', name: 'Deepa Rao',     email: 'staff@qspiders.com',      password: 'staff123', role: 'center_staff' },
  { id: '5', name: 'Vikram Singh',  email: 'auditor@qspiders.com',    password: 'audit123', role: 'auditor' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (user) => {
    setForm({ email: user.email, password: user.password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Branding panel */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
              <Shield size={30} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">QSpiders</h1>
              <p className="text-slate-400">Asset Management Portal</p>
            </div>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed">
            Centralized asset tracking, AI-powered scanning, and governance workflows for all QSpiders training centers.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Assets', value: '150+' },
              { label: 'Centers', value: '6' },
              { label: 'Avg Scan Time', value: '< 30s' },
              { label: 'Accuracy', value: '92%+' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-orange-400">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">QSpiders Asset Portal</h2>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@qspiders.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={() => quickLogin(u)}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-orange-50 rounded-lg text-sm border border-slate-100 hover:border-orange-200 transition group"
                >
                  <div className="text-left">
                    <span className="font-medium text-slate-700 group-hover:text-orange-600">{u.name}</span>
                    <span className="text-slate-400 ml-2 text-xs">{u.email}</span>
                  </div>
                  <span className="text-xs bg-slate-200 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 px-2 py-0.5 rounded-full font-medium">
                    {u.role.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
