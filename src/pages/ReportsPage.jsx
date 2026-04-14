import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CENTERS, CATEGORIES } from '../lib/mockData'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts'
import { FileText, Download, Wrench, AlertTriangle, ArrowLeftRight, Trash2, Package } from 'lucide-react'

const DEPRECIATION = { 'IT & Electronics': 3, 'Furniture': 10, 'HVAC & Electrical': 8 }

function ReportCard({ icon: Icon, title, description, onExport, color = 'orange' }) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-500',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    red: 'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-500',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition flex-shrink-0"
      >
        <Download size={12} />
        Export
      </button>
    </div>
  )
}

function exportCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { assets, transfers, maintenance, auditLogs } = useData()

  const filteredAssets = useMemo(() => {
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      return assets.filter(a => a.center_id === user.center_id)
    }
    return assets
  }, [assets, user])

  const warrantyAlerts = useMemo(() => filteredAssets.filter(a => {
    if (!a.warranty_expiry) return false
    const days = Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24))
    return days <= 90 && days > 0
  }).map(a => ({
    asset_id: a.id,
    asset_name: a.asset_name,
    center: a.center_name,
    warranty_expiry: a.warranty_expiry,
    days_left: Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)),
  })), [filteredAssets])

  // Center comparison data
  const centerData = useMemo(() => {
    return CENTERS.map(c => {
      const centerAssets = assets.filter(a => a.center_id === c.id)
      const totalVal = centerAssets.reduce((s, a) => s + (a.purchase_value || 0) * (a.quantity || 1), 0)
      return {
        center: c.id,
        name: c.name,
        count: centerAssets.length,
        value: Math.round(totalVal / 1000),
        good: centerAssets.filter(a => a.condition === 'Good').length,
        fair: centerAssets.filter(a => a.condition === 'Fair').length,
        repair: centerAssets.filter(a => a.condition === 'Needs Repair').length,
      }
    }).filter(c => c.count > 0)
  }, [assets])

  // Valuation by category
  const valByCategory = useMemo(() => {
    return CATEGORIES.map(cat => {
      const list = filteredAssets.filter(a => a.category === cat.name)
      const total = list.reduce((s, a) => s + (parseFloat(a.purchase_value) || 0) * (a.quantity || 1), 0)
      const usefulLife = DEPRECIATION[cat.name] || 5
      const avgAge = list.reduce((s, a) => {
        if (!a.purchase_date) return s
        return s + (new Date() - new Date(a.purchase_date)) / (1000 * 60 * 60 * 24 * 365)
      }, 0) / Math.max(list.length, 1)
      const deprecRate = 1 / usefulLife
      const currentVal = total * Math.max(0, 1 - deprecRate * avgAge)
      return {
        name: cat.name.split('&')[0].trim(),
        original: Math.round(total / 1000),
        current: Math.round(currentVal / 1000),
      }
    }).filter(c => c.original > 0)
  }, [filteredAssets])

  const totalOriginal = filteredAssets.reduce((s, a) => s + (parseFloat(a.purchase_value) || 0) * (a.quantity || 1), 0)
  const activeCount = filteredAssets.filter(a => a.status === 'Active').length
  const decommCount = filteredAssets.filter(a => a.status === 'Decommissioned').length
  const maintenanceCount = filteredAssets.filter(a => a.status === 'Under Maintenance').length

  const handleExportFull = () => {
    exportCSV('qspiders-full-register.csv',
      ['Asset ID', 'Name', 'Category', 'Sub-category', 'Brand', 'Model', 'Serial No', 'Center', 'Location', 'Qty', 'Condition', 'Status', 'Purchase Date', 'Value (₹)', 'Vendor', 'Warranty Expiry', 'Custodian', 'Department', 'Last Verified'],
      filteredAssets.map(a => [a.id, a.asset_name, a.category, a.sub_category, a.make_brand, a.model_no, a.serial_no, a.center_name, a.location, a.quantity, a.condition, a.status, a.purchase_date, a.purchase_value, a.vendor, a.warranty_expiry, a.custodian, a.department, a.last_verified])
    )
  }

  const handleExportMaintenance = () => {
    exportCSV('qspiders-maintenance.csv',
      ['ID', 'Asset', 'Center', 'Issue', 'Vendor', 'Technician', 'Start Date', 'Expected Return', 'Actual Return', 'Est Cost', 'Actual Cost', 'Status'],
      maintenance.map(m => [m.id, m.asset_name, m.center_id, m.issue, m.vendor, m.technician, m.start_date, m.expected_return, m.actual_return, m.estimated_cost, m.actual_cost, m.status])
    )
  }

  const handleExportTransfers = () => {
    exportCSV('qspiders-transfers.csv',
      ['Transfer ID', 'Asset', 'From', 'To', 'Status', 'Reason', 'Initiated By', 'Approved By', 'Dispatched', 'Received'],
      transfers.map(t => [t.id, t.asset_name, t.from_center, t.to_center, t.status, t.reason, t.initiated_by, t.approved_by, t.dispatched_date, t.received_date])
    )
  }

  const handleExportWarranty = () => {
    exportCSV('qspiders-warranty.csv',
      ['Asset ID', 'Name', 'Center', 'Warranty Expiry', 'Days Left'],
      warrantyAlerts.map(a => [a.asset_id, a.asset_name, a.center, a.warranty_expiry, a.days_left])
    )
  }

  const handleExportDecomm = () => {
    const decomm = filteredAssets.filter(a => a.status === 'Decommissioned')
    exportCSV('qspiders-decommissioned.csv',
      ['Asset ID', 'Name', 'Category', 'Center', 'Condition', 'Reason', 'Value (₹)'],
      decomm.map(a => [a.id, a.asset_name, a.category, a.center_name, a.condition, a.decommission_reason || '', (a.purchase_value || 0) * (a.quantity || 1)])
    )
  }

  const handleExportAudit = () => {
    exportCSV('qspiders-audit-log.csv',
      ['Action', 'Asset ID', 'Asset Name', 'Center', 'User', 'Timestamp', 'Details'],
      auditLogs.map(l => [l.action, l.asset_id, l.asset_name, l.center, l.user, l.timestamp, l.details])
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: filteredAssets.length, color: 'text-slate-800' },
          { label: 'Portfolio Value', value: `₹${(totalOriginal / 100000).toFixed(1)}L`, color: 'text-green-600' },
          { label: 'Active', value: activeCount, color: 'text-blue-600' },
          { label: 'Decommissioned', value: decommCount, color: 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Available reports */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800">Available Reports</h2>
        <div className="grid gap-3">
          <ReportCard
            icon={Package}
            title="Full Asset Register"
            description="All assets with every field — filterable by center, category, date"
            onExport={handleExportFull}
            color="orange"
          />
          <ReportCard
            icon={Wrench}
            title="Maintenance History"
            description="All maintenance events, vendors, costs, and turnaround times"
            onExport={handleExportMaintenance}
            color="blue"
          />
          <ReportCard
            icon={ArrowLeftRight}
            title="Transfer Register"
            description="All inter-center transfers with from/to/date/approver"
            onExport={handleExportTransfers}
            color="purple"
          />
          <ReportCard
            icon={AlertTriangle}
            title="Warranty Expiry Report"
            description="Assets with warranty expiring in the next 90 days"
            onExport={handleExportWarranty}
            color="orange"
          />
          <ReportCard
            icon={Trash2}
            title="Decommission Log"
            description="All decommissioned assets with reason and approver"
            onExport={handleExportDecomm}
            color="red"
          />
          <ReportCard
            icon={FileText}
            title="Full Audit Log"
            description="Complete change history — every addition, edit, transfer, decommission"
            onExport={handleExportAudit}
            color="green"
          />
        </div>
      </div>

      {/* Analytics charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Center comparison */}
        {(user?.role === 'super_admin' || user?.role === 'ops_admin' || user?.role === 'auditor') && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Center Comparison — Asset Count</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={centerData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="center" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(val, name, props) => [val, props.payload.name]}
                />
                <Bar dataKey="good" name="Good" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="fair" name="Fair" stackId="a" fill="#f59e0b" />
                <Bar dataKey="repair" name="Needs Repair" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Valuation by category */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Asset Valuation by Category (₹K)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={valByCategory} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(val) => [`₹${val}K`]}
              />
              <Bar dataKey="original" name="Original Value" fill="#94a3b8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="current" name="Est. Current Value" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-2 text-center">Depreciation: IT 3yr · Furniture 10yr · HVAC 8yr · Other 5yr</p>
        </div>
      </div>

      {/* Warranty alerts table */}
      {warrantyAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Warranty Expiry Watch ({warrantyAlerts.length} items)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Asset</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Center</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Expiry Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {warrantyAlerts.map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-700">{a.asset_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{a.center}</td>
                    <td className="py-2.5 px-3 text-slate-500">{a.warranty_expiry}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${a.days_left <= 30 ? 'text-red-600' : a.days_left <= 60 ? 'text-amber-600' : 'text-yellow-600'}`}>
                        {a.days_left} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
