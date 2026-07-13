import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CENTERS } from '../lib/mockData'
import { Wrench, Plus, X, Check, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"

function StartMaintenanceModal({ onClose }) {
  const { user } = useAuth()
  const { assets, startMaintenance } = useData()
  const [form, setForm] = useState({
    asset_id: '', center_id: user?.center_id || '',
    issue: '', vendor: '', technician: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_return: '', estimated_cost: '',
  })

  const eligibleAssets = useMemo(() => {
    return assets.filter(a => {
      const centerMatch = user?.role === 'center_head' || user?.role === 'center_staff'
        ? a.center_id === user.center_id
        : !form.center_id || a.center_id === form.center_id
      // Eligible: Active assets (includes condition "Needs Repair"; that is not a status)
      return centerMatch && a.status === 'Active'
    })
  }, [assets, user, form.center_id])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.asset_id || !form.issue) {
      toast.error('Asset and issue description are required')
      return
    }
    const asset = assets.find(a => a.id === form.asset_id)
    startMaintenance({
      ...form,
      asset_name: asset?.asset_name || form.asset_id,
      center_id: asset?.center_id || form.center_id,
      estimated_cost: parseFloat(form.estimated_cost) || 0,
    }, user)
    toast.success('Maintenance record created')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">Log Maintenance</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className={inputCls}>
              <option value="">Select asset…</option>
              {eligibleAssets.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.id})</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Issue Description *</label>
            <textarea
              value={form.issue}
              onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
              placeholder="Describe the problem or maintenance required…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Vendor / Service Centre</label>
              <input type="text" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Service provider" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Technician Name</label>
              <input type="text" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} placeholder="Technician assigned" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Expected Return</label>
              <input type="date" value={form.expected_return} onChange={e => setForm(f => ({ ...f, expected_return: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Estimated Cost (₹)</label>
            <input type="number" min={0} value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="0" className={inputCls} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition">
              Log Maintenance
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CompleteMaintenanceModal({ record, onClose }) {
  const { user } = useAuth()
  const { completeMaintenance } = useData()
  const [form, setForm] = useState({ actualCost: record.estimated_cost || '', condition: 'Good' })

  const handleSubmit = (e) => {
    e.preventDefault()
    completeMaintenance(record.id, parseFloat(form.actualCost) || 0, form.condition, user)
    toast.success('Maintenance completed! Asset returned to Active.')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Complete Maintenance</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800">{record.asset_name}</p>
            <p className="text-xs text-green-600 mt-0.5">{record.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Actual Cost (₹)</label>
            <input type="number" min={0} value={form.actualCost} onChange={e => setForm(f => ({ ...f, actualCost: e.target.value }))} className={inputCls} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Condition after repair</label>
            <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className={inputCls}>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Needs Repair">Needs Repair (partial fix)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition">
              <CheckCircle size={15} />
              Mark Complete
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MaintenancePage() {
  const { user } = useAuth()
  const { maintenance } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  const canAdd = user?.role !== 'auditor'

  const visible = useMemo(() => {
    let list = maintenance
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(m => m.center_id === user.center_id)
    }
    if (filterStatus) list = list.filter(m => m.status === filterStatus)
    return list
  }, [maintenance, user, filterStatus])

  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-1">
          {['', 'In Progress', 'Completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus size={15} />
            Log Maintenance
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
            <Wrench size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">No maintenance records</p>
          </div>
        ) : visible.map(record => (
          <div key={record.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${record.status === 'In Progress' ? 'bg-blue-50' : 'bg-green-50'}`}>
                  <Wrench size={20} className={record.status === 'In Progress' ? 'text-blue-500' : 'text-green-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{record.asset_name}</p>
                    <span className="font-mono text-xs text-slate-400">{record.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${record.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{record.issue}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{getCenterName(record.center_id)}</span>
                    {record.vendor && <span>· Vendor: {record.vendor}</span>}
                    {record.technician && <span>· Tech: {record.technician}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>Started: {record.start_date}</span>
                    {record.expected_return && <span>· Expected: {record.expected_return}</span>}
                    {record.actual_return && <span>· Returned: {record.actual_return}</span>}
                    {record.estimated_cost > 0 && <span>· Est. cost: ₹{record.estimated_cost.toLocaleString('en-IN')}</span>}
                    {record.actual_cost != null && record.actual_cost > 0 && <span>· Actual cost: ₹{record.actual_cost.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              </div>

              {canAdd && record.status === 'In Progress' && (
                <button
                  onClick={() => setCompleting(record)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-semibold transition flex-shrink-0"
                >
                  <Check size={14} />
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd && <StartMaintenanceModal onClose={() => setShowAdd(false)} />}
      {completing && <CompleteMaintenanceModal record={completing} onClose={() => setCompleting(null)} />}
    </div>
  )
}
