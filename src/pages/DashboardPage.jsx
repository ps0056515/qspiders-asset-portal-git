import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Package, DollarSign, Activity, AlertTriangle, Building2,
  Wrench, ClipboardCheck
} from 'lucide-react'
import { format } from 'date-fns'

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all text-left w-full group ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color ? color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100') : 'bg-orange-100'}`}>
          <Icon size={22} className={color || 'text-orange-500'} />
        </div>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { assets, transfers, maintenance, auditLogs, centers } = useData()
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      return assets.filter(a => a.center_id === user.center_id)
    }
    return assets
  }, [assets, user])

  const activeAssets = filtered.filter(a => a.status === 'Active')
  const totalValue = filtered.reduce((sum, a) => sum + (parseFloat(a.purchase_value) || 0) * (a.quantity || 1), 0)
  const needsAttention = filtered.filter(a => ['Under Maintenance', 'Needs Repair', 'Pending Decommission'].includes(a.status) || a.condition === 'Needs Repair').length
  const pendingApprovals = assets.filter(a => a.status === 'Pending Decommission').length + transfers.filter(t => t.status === 'Pending Approval').length

  const warrantyAlerts = useMemo(() => filtered.filter(a => {
    if (!a.warranty_expiry) return false
    const days = Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24))
    return days <= 90 && days > 0
  }).map(a => ({
    asset_name: a.asset_name,
    center: a.center_name,
    warranty_expiry: a.warranty_expiry,
    days_left: Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)),
  })), [filtered])

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = {}
    filtered.forEach(a => {
      const key = a.category?.split('&')[0]?.trim() || 'Other'
      map[key] = (map[key] || 0) + (a.quantity || 1)
    })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [filtered])

  // Center breakdown (admin only)
  const centerData = useMemo(() => {
    return centers.map(c => ({
      name: c.id,
      full: c.name,
      count: assets.filter(a => a.center_id === c.id).length,
    })).filter(c => c.count > 0)
  }, [assets, centers])

  // Condition pie
  const conditionData = useMemo(() => {
    const map = { Good: 0, Fair: 0, 'Needs Repair': 0, Damaged: 0 }
    filtered.forEach(a => { if (map[a.condition] !== undefined) map[a.condition]++ })
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const COND_COLORS = { Good: '#10b981', Fair: '#f59e0b', 'Needs Repair': '#ef4444', Damaged: '#6b7280' }

  const centersReporting = useMemo(() => {
    const set = new Set(assets.filter(a => {
      const d = new Date(a.last_verified)
      const now = new Date()
      return (now - d) / (1000 * 60 * 60 * 24 * 90) < 1
    }).map(a => a.center_id))
    return set.size
  }, [assets])

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          label="Total Assets"
          value={filtered.length}
          sub={`${activeAssets.length} active`}
          onClick={() => navigate('/assets')}
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`₹${(totalValue / 100000).toFixed(1)}L`}
          sub="Purchase value"
          color="text-green-600"
        />
        <StatCard
          icon={Activity}
          label="Active Assets"
          value={activeAssets.length}
          sub={`${Math.round((activeAssets.length / Math.max(filtered.length, 1)) * 100)}% of total`}
          color="text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={needsAttention}
          sub="Maintenance + repair"
          color="text-amber-600"
          onClick={() => navigate('/maintenance')}
        />
        <StatCard
          icon={Building2}
          label="Centers Reporting"
          value={`${centersReporting}/${centers.length}`}
          sub="This quarter"
          color="text-purple-600"
        />
      </div>

      {/* Pending approvals banner */}
      {pendingApprovals > 0 && (user?.role === 'super_admin' || user?.role === 'ops_admin' || user?.role === 'center_head') && (
        <button
          onClick={() => navigate('/approvals')}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between hover:bg-amber-100 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClipboardCheck size={20} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-amber-800">{pendingApprovals} item{pendingApprovals > 1 ? 's' : ''} pending your approval</p>
              <p className="text-sm text-amber-600">Click to review deletion and transfer requests</p>
            </div>
          </div>
          <span className="text-amber-600 font-medium text-sm group-hover:underline">Review →</span>
        </button>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Category bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Assets by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Assets" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Condition pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Condition Overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={conditionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {conditionData.map((entry, i) => (
                  <Cell key={i} fill={COND_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Center chart — admin only */}
      {(user?.role === 'super_admin' || user?.role === 'ops_admin' || user?.role === 'auditor') && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Assets by Center</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={centerData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(val, name, props) => [val, props.payload.full]}
              />
              <Bar dataKey="count" name="Assets" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: Recent activity + Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {auditLogs.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.action}</span>
                    {' — '}
                    <span className="text-slate-500">{log.asset_name}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{log.user}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts panel */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Alerts & Reminders</h3>
          <div className="space-y-3">
            {warrantyAlerts.length > 0 ? warrantyAlerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.days_left <= 30 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <AlertTriangle size={16} className={alert.days_left <= 30 ? 'text-red-500 mt-0.5 flex-shrink-0' : 'text-amber-500 mt-0.5 flex-shrink-0'} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{alert.asset_name}</p>
                  <p className="text-xs text-slate-500">{alert.center} · Warranty expires in <strong>{alert.days_left} days</strong></p>
                </div>
              </div>
            )) : null}

            {maintenance.filter(m => m.status === 'In Progress').map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Wrench size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{m.asset_name}</p>
                  <p className="text-xs text-slate-500">Under maintenance · Expected: {m.expected_return}</p>
                </div>
              </div>
            ))}

            {warrantyAlerts.length === 0 && maintenance.filter(m => m.status === 'In Progress').length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Activity size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
