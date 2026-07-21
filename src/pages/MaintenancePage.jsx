import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useCenterFilter } from '../contexts/CenterFilterContext'
import { CENTERS } from '../lib/mockData'
import {
  Search, X, Check, Wrench, CheckCircle, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRegisterToolbarActions } from '../components/Layout/SectionPillBar'

const STATUS_COLORS = {
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white'

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function MaintenanceInspector({ mode, record, onClose }) {
  const { user } = useAuth()
  const { assets, maintenance, startMaintenance, completeMaintenance } = useData()
  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  const [form, setForm] = useState({
    asset_id: '',
    center_id: user?.center_id || '',
    issue: '',
    vendor: '',
    technician: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_return: '',
    estimated_cost: '',
  })
  const [completeForm, setCompleteForm] = useState({ actualCost: '', condition: 'Good' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (mode === 'add') {
      setForm({
        asset_id: '',
        center_id: user?.center_id || '',
        issue: '',
        vendor: '',
        technician: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_return: '',
        estimated_cost: '',
      })
    }
    if (mode === 'complete' && record) {
      setCompleteForm({ actualCost: record.estimated_cost || '', condition: 'Good' })
    }
  }, [mode, record, user])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canAdd = user?.role !== 'auditor'
  const live = record ? (maintenance.find(m => m.id === record.id) || record) : null

  const eligibleAssets = useMemo(() => {
    return assets.filter(a => {
      const centerMatch = user?.role === 'center_head' || user?.role === 'center_staff'
        ? a.center_id === user.center_id
        : !form.center_id || a.center_id === form.center_id
      return centerMatch && a.status === 'Active'
    })
  }, [assets, user, form.center_id])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.asset_id || !form.issue) {
      toast.error('Asset and issue description are required')
      return
    }
    setSubmitting(true)
    try {
      const asset = assets.find(a => a.id === form.asset_id)
      await startMaintenance({
        ...form,
        asset_name: asset?.asset_name || form.asset_id,
        center_id: asset?.center_id || form.center_id,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
      }, user)
      toast.success('Maintenance record created')
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to create')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    if (!live) return
    setSubmitting(true)
    try {
      await completeMaintenance(live.id, parseFloat(completeForm.actualCost) || 0, completeForm.condition, user)
      toast.success('Maintenance completed')
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to complete')
    } finally {
      setSubmitting(false)
    }
  }

  const title = {
    view: 'Maintenance details',
    add: 'Log maintenance',
    complete: 'Complete maintenance',
  }[mode] || 'Maintenance'

  return (
    <aside className="w-full lg:w-[380px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/80">
        <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-violet-100 rounded-lg" title="Close (Esc)">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {mode === 'view' && live && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-slate-800">{live.asset_name}</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{live.id}</p>
              <div className="mt-2"><StatusPill status={live.status} /></div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{live.issue}</p>
            <dl className="space-y-2 text-sm">
              {[
                ['Center', getCenterName(live.center_id)],
                ['Vendor', live.vendor],
                ['Technician', live.technician],
                ['Started', live.start_date],
                ['Expected', live.expected_return],
                ['Returned', live.actual_return],
                ['Est. cost', live.estimated_cost > 0 ? `₹${live.estimated_cost.toLocaleString('en-IN')}` : null],
                ['Actual cost', live.actual_cost != null && live.actual_cost > 0 ? `₹${live.actual_cost.toLocaleString('en-IN')}` : null],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            {canAdd && live.status === 'In Progress' && (
              <button
                type="button"
                onClick={() => onClose({ switchTo: 'complete', record: live })}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
              >
                <Check size={14} /> Mark complete
              </button>
            )}
          </div>
        )}

        {mode === 'complete' && live && (
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800">{live.asset_name}</p>
              <p className="text-xs text-green-600 mt-0.5">{live.id}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual cost (₹)</label>
              <input
                type="number"
                min={0}
                value={completeForm.actualCost}
                onChange={e => setCompleteForm(f => ({ ...f, actualCost: e.target.value }))}
                className={`${inputCls} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Condition after repair</label>
              <select
                value={completeForm.condition}
                onChange={e => setCompleteForm(f => ({ ...f, condition: e.target.value }))}
                className={`${inputCls} mt-1`}
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair (partial fix)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                <CheckCircle size={15} /> Complete
              </button>
            </div>
          </form>
        )}

        {mode === 'add' && (
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset *</label>
              <select
                value={form.asset_id}
                onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}
                className={`${inputCls} mt-1`}
              >
                <option value="">Select…</option>
                {eligibleAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.asset_name} ({a.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Issue *</label>
              <textarea
                value={form.issue}
                onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
                rows={3}
                placeholder="Describe the problem…"
                className={`${inputCls} mt-1 resize-none`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</label>
                <input type="text" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Technician</label>
                <input type="text" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected</label>
                <input type="date" value={form.expected_return} onChange={e => setForm(f => ({ ...f, expected_return: e.target.value }))} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. cost (₹)</label>
              <input type="number" min={0} value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} className={`${inputCls} mt-1`} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                <Save size={15} /> Log
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  )
}

export default function MaintenancePage() {
  const { user } = useAuth()
  const { maintenance } = useData()
  const { selectedCenterId } = useCenterFilter()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [panelMode, setPanelMode] = useState(null)
  const searchRef = useRef(null)
  const filtersRef = useRef(null)

  const canAdd = user?.role !== 'auditor'
  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  const openAdd = useCallback(() => {
    setSelectedId(null)
    setPanelMode('add')
  }, [])

  useRegisterToolbarActions({
    focusSearch: () => searchRef.current?.focus(),
    focusFilters: () => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    add: openAdd,
  })

  useEffect(() => {
    if (searchParams.get('mode') === 'add' && canAdd) {
      setPanelMode('add')
      setSelectedId(null)
      const next = new URLSearchParams(searchParams)
      next.delete('mode')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, canAdd])

  const visible = useMemo(() => {
    let list = maintenance
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(m => m.center_id === user.center_id)
    } else if (selectedCenterId) {
      list = list.filter(m => m.center_id === selectedCenterId)
    }
    if (filterStatus) list = list.filter(m => m.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.asset_name?.toLowerCase().includes(q) ||
        m.id?.toLowerCase().includes(q) ||
        m.issue?.toLowerCase().includes(q) ||
        m.vendor?.toLowerCase().includes(q) ||
        getCenterName(m.center_id).toLowerCase().includes(q)
      )
    }
    return list
  }, [maintenance, user, selectedCenterId, filterStatus, search])

  const selected = useMemo(
    () => maintenance.find(m => m.id === selectedId) || null,
    [maintenance, selectedId]
  )

  const closePanel = (opts) => {
    if (opts?.switchTo === 'complete' && opts.record) {
      setSelectedId(opts.record.id)
      setPanelMode('complete')
      return
    }
    setPanelMode(null)
    setSelectedId(null)
  }

  const showPanel = panelMode !== null

  return (
    <div className="space-y-3">
      <div ref={filtersRef} className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Asset, ID, issue, vendor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="min-w-40">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        {filterStatus && (
          <button type="button" onClick={() => setFilterStatus('')} className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1.5">
            Clear filters
          </button>
        )}
        <p className="ml-auto text-sm text-slate-500 self-center">
          <strong className="text-slate-700">{visible.length}</strong> records
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className={`min-w-0 ${showPanel ? 'flex-1 w-full' : 'w-full'}`}>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-16rem)]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-violet-50 border-b border-violet-100">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Asset</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Center</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Started</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <Wrench size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-medium">No maintenance records</p>
                      </td>
                    </tr>
                  ) : visible.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => { setSelectedId(m.id); setPanelMode('view') }}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        selectedId === m.id ? 'bg-violet-100/70' : 'hover:bg-violet-50/50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{m.asset_name}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-56">{m.issue}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{getCenterName(m.center_id)}</td>
                      <td className="px-3 py-2.5"><StatusPill status={m.status} /></td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{m.start_date || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{m.id}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{m.vendor || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showPanel && (
          <MaintenanceInspector
            mode={panelMode}
            record={selected}
            onClose={closePanel}
          />
        )}
      </div>
    </div>
  )
}
