import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useCenterFilter } from '../contexts/CenterFilterContext'
import { CENTERS } from '../lib/mockData'
import {
  Search, X, Check, ArrowLeftRight, ChevronRight, Package, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRegisterToolbarActions } from '../components/Layout/SectionPillBar'

const STATUS_COLORS = {
  'Pending Approval': 'bg-amber-100 text-amber-700',
  'In Transit': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
}

const TRANSFER_STATUSES = ['Pending Approval', 'In Transit', 'Completed', 'Rejected']

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white'

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function TransferInspector({ mode, transfer, onClose, onModeChange, prefillAssetId }) {
  const { user } = useAuth()
  const { assets, transfers, initiateTransfer, approveTransfer, completeTransfer } = useData()

  const [form, setForm] = useState({
    asset_id: '',
    from_center: user?.center_id || '',
    to_center: '',
    quantity: 1,
    reason: '',
    new_location: '',
    new_custodian: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (mode !== 'add') return
    const pre = prefillAssetId ? assets.find(a => a.id === prefillAssetId) : null
    setForm({
      asset_id: pre?.id || '',
      from_center: pre?.center_id || user?.center_id || '',
      to_center: '',
      quantity: 1,
      reason: '',
      new_location: '',
      new_custodian: '',
    })
  }, [mode, prefillAssetId, assets, user])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'
  const canApprove = user?.role === 'super_admin' || user?.role === 'ops_admin'
  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  const eligibleAssets = useMemo(() => {
    return assets.filter(a => {
      const centerMatch = user?.role === 'center_head' || user?.role === 'center_staff'
        ? a.center_id === user.center_id
        : a.center_id === form.from_center
      return centerMatch && a.status === 'Active'
    })
  }, [assets, user, form.from_center])

  const selectedAsset = assets.find(a => a.id === form.asset_id)
  const live = transfer ? (transfers.find(t => t.id === transfer.id) || transfer) : null

  const isDestination = live && live.to_center === user?.center_id
  const canConfirmReceipt = live && isDestination && live.status === 'In Transit'
    && (user?.role === 'center_head' || user?.role === 'center_staff')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.asset_id || !form.to_center || !form.reason) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.from_center === form.to_center) {
      toast.error('Source and destination centers cannot be the same')
      return
    }
    setSubmitting(true)
    try {
      const asset = assets.find(a => a.id === form.asset_id)
      await initiateTransfer({
        ...form,
        asset_name: asset?.asset_name || form.asset_id,
      }, user)
      toast.success('Transfer request submitted')
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'add' ? 'New transfer' : 'Transfer details'

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
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-violet-50 rounded-lg px-3 py-2.5">
              <span className="font-medium">{getCenterName(live.from_center)}</span>
              <ChevronRight size={14} className="text-violet-400" />
              <span className="font-medium text-violet-700">{getCenterName(live.to_center)}</span>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Reason', live.reason],
                ['Initiated by', live.initiated_by],
                ['Approved by', live.approved_by],
                ['Dispatched', live.dispatched_date],
                ['Received', live.received_date],
                ['New location', live.new_location],
                ['New custodian', live.new_custodian],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              {canApprove && live.status === 'Pending Approval' && (
                <button
                  type="button"
                  onClick={async () => {
                    await approveTransfer(live.id, user)
                    toast.success('Transfer approved')
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Check size={14} /> Approve
                </button>
              )}
              {canConfirmReceipt && (
                <button
                  type="button"
                  onClick={async () => {
                    await completeTransfer(live.id, user)
                    toast.success('Receipt confirmed')
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Package size={14} /> Confirm receipt
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'add' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {canChangeCenter && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">From center *</label>
                <select
                  value={form.from_center}
                  onChange={e => setForm(f => ({ ...f, from_center: e.target.value, asset_id: '' }))}
                  className={`${inputCls} mt-1`}
                >
                  <option value="">Select…</option>
                  {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
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
              {selectedAsset && (
                <p className="text-xs text-slate-400 mt-1">
                  {selectedAsset.category} · {selectedAsset.location} · Qty: {selectedAsset.quantity}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination *</label>
              <select
                value={form.to_center}
                onChange={e => setForm(f => ({ ...f, to_center: e.target.value }))}
                className={`${inputCls} mt-1`}
              >
                <option value="">Select…</option>
                {CENTERS.filter(c => c.id !== (form.from_center || user?.center_id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New location</label>
              <input type="text" value={form.new_location} onChange={e => setForm(f => ({ ...f, new_location: e.target.value }))} placeholder="Lab 1, 2nd Floor" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New custodian</label>
              <input type="text" value={form.new_custodian} onChange={e => setForm(f => ({ ...f, new_custodian: e.target.value }))} placeholder="Staff at destination" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason *</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Why is this transfer needed?" className={`${inputCls} mt-1 resize-none`} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                <Save size={15} /> Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  )
}

export default function TransfersPage() {
  const { user } = useAuth()
  const { transfers } = useData()
  const { selectedCenterId } = useCenterFilter()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [panelMode, setPanelMode] = useState(null)
  const [prefillAssetId, setPrefillAssetId] = useState('')
  const searchRef = useRef(null)
  const filtersRef = useRef(null)

  const canInitiate = user?.role !== 'auditor'
  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  const openAdd = useCallback(() => {
    setPrefillAssetId('')
    setSelectedId(null)
    setPanelMode('add')
  }, [])

  useRegisterToolbarActions({
    focusSearch: () => searchRef.current?.focus(),
    focusFilters: () => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    add: openAdd,
  })

  useEffect(() => {
    const assetId = searchParams.get('asset')
    const mode = searchParams.get('mode')
    if (assetId && canInitiate) {
      setPrefillAssetId(assetId)
      setPanelMode('add')
      setSelectedId(null)
      const next = new URLSearchParams(searchParams)
      next.delete('asset')
      next.delete('mode')
      setSearchParams(next, { replace: true })
    } else if (mode === 'add' && canInitiate) {
      setPanelMode('add')
      setSelectedId(null)
      const next = new URLSearchParams(searchParams)
      next.delete('mode')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, canInitiate])

  const visible = useMemo(() => {
    let list = transfers
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(t => t.from_center === user.center_id || t.to_center === user.center_id)
    } else if (selectedCenterId) {
      list = list.filter(t => t.from_center === selectedCenterId || t.to_center === selectedCenterId)
    }
    if (filterStatus) list = list.filter(t => t.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.asset_name?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.reason?.toLowerCase().includes(q) ||
        getCenterName(t.from_center).toLowerCase().includes(q) ||
        getCenterName(t.to_center).toLowerCase().includes(q)
      )
    }
    return list
  }, [transfers, user, selectedCenterId, filterStatus, search])

  const selected = useMemo(
    () => transfers.find(t => t.id === selectedId) || null,
    [transfers, selectedId]
  )

  const openView = (t) => {
    setSelectedId(t.id)
    setPanelMode('view')
  }

  const closePanel = () => {
    setPanelMode(null)
    setSelectedId(null)
    setPrefillAssetId('')
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
              placeholder="Asset, ID, center, reason…"
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
            {TRANSFER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filterStatus && (
          <button type="button" onClick={() => setFilterStatus('')} className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1.5">
            Clear filters
          </button>
        )}
        <p className="ml-auto text-sm text-slate-500 self-center">
          <strong className="text-slate-700">{visible.length}</strong> transfers
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
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Route</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Initiated</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <ArrowLeftRight size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-medium">No transfers found</p>
                      </td>
                    </tr>
                  ) : visible.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => openView(t)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        selectedId === t.id ? 'bg-violet-100/70' : 'hover:bg-violet-50/50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{t.asset_name}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-48">{t.reason}</p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <span>{getCenterName(t.from_center)}</span>
                          <ChevronRight size={12} className="text-violet-400" />
                          <span className="text-violet-700 font-medium">{getCenterName(t.to_center)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={t.status} /></td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{t.id}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{t.initiated_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showPanel && (
          <TransferInspector
            mode={panelMode}
            transfer={selected}
            prefillAssetId={prefillAssetId}
            onClose={closePanel}
            onModeChange={setPanelMode}
          />
        )}
      </div>
    </div>
  )
}
