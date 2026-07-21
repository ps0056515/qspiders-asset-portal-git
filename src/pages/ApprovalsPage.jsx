import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useCenterFilter } from '../contexts/CenterFilterContext'
import { CENTERS } from '../lib/mockData'
import {
  Search, X, Check, ClipboardCheck, AlertTriangle, ArrowLeftRight, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRegisterToolbarActions } from '../components/Layout/SectionPillBar'

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white'

function ApprovalInspector({ item, onClose }) {
  const { user } = useAuth()
  const { approveDecommission, approveTransfer } = useData()
  const [rejectReason, setRejectReason] = useState('')
  const [mode, setMode] = useState('view') // view | reject
  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  useEffect(() => {
    setMode('view')
    setRejectReason('')
  }, [item?.key])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const handleApproveDecomm = async () => {
    await approveDecommission(item.data.id, true, '', user)
    toast.success(`${item.data.asset_name} decommissioned`)
    onClose()
  }

  const handleRejectDecomm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    await approveDecommission(item.data.id, false, rejectReason, user)
    toast.success('Decommission request rejected')
    onClose()
  }

  const handleApproveTransfer = async () => {
    await approveTransfer(item.data.id, user)
    toast.success('Transfer approved')
    onClose()
  }

  return (
    <aside className="w-full lg:w-[380px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/80">
        <h3 className="text-sm font-semibold text-violet-900">
          {mode === 'reject' ? 'Reject request' : 'Review request'}
        </h3>
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-violet-100 rounded-lg" title="Close (Esc)">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {item.type === 'decommission' && mode === 'view' && (
          <>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-base font-semibold text-slate-800">{item.data.asset_name}</p>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{item.data.id}</p>
                <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Decommission
                </span>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Center', item.data.center_name],
                ['Location', item.data.location],
                ['Category', item.data.category],
                ['Condition', item.data.condition],
                ['Qty', item.data.quantity],
                ['Value', `₹${((item.data.purchase_value || 0) * (item.data.quantity || 1)).toLocaleString('en-IN')}`],
              ].filter(([, v]) => v != null && v !== '').map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            {item.data.decommission_reason && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-amber-700">Reason: {item.data.decommission_reason}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('reject')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm font-semibold"
              >
                <X size={14} /> Reject
              </button>
              <button
                type="button"
                onClick={handleApproveDecomm}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-semibold"
              >
                <Check size={14} /> Approve
              </button>
            </div>
          </>
        )}

        {item.type === 'decommission' && mode === 'reject' && (
          <>
            <p className="text-sm text-slate-600">
              Reject decommission for <strong>{item.data.asset_name}</strong>
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rejection reason *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Explain why this request is being rejected…"
                className={`${inputCls} mt-1 resize-none`}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('view')} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Back
              </button>
              <button
                type="button"
                onClick={handleRejectDecomm}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"
              >
                Reject request
              </button>
            </div>
          </>
        )}

        {item.type === 'transfer' && (
          <>
            <div className="flex items-start gap-2">
              <ArrowLeftRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-base font-semibold text-slate-800">{item.data.asset_name}</p>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{item.data.id}</p>
                <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Transfer
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-violet-50 rounded-lg px-3 py-2.5">
              <span className="font-medium">{getCenterName(item.data.from_center)}</span>
              <ChevronRight size={14} className="text-violet-400" />
              <span className="font-medium text-violet-700">{getCenterName(item.data.to_center)}</span>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Requested by', item.data.initiated_by],
                ['Reason', item.data.reason],
                ['New location', item.data.new_location],
                ['New custodian', item.data.new_custodian],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={handleApproveTransfer}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-semibold"
            >
              <Check size={14} /> Approve transfer
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { assets, transfers } = useData()
  const { selectedCenterId } = useCenterFilter()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('') // '' | decommission | transfer
  const [selectedKey, setSelectedKey] = useState(null)
  const searchRef = useRef(null)
  const filtersRef = useRef(null)

  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  useRegisterToolbarActions({
    focusSearch: () => searchRef.current?.focus(),
    focusFilters: () => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
  })

  const rows = useMemo(() => {
    const decomm = assets
      .filter(a => {
        if (a.status !== 'Pending Decommission') return false
        if (user?.role === 'center_head') return a.center_id === user.center_id
        if (selectedCenterId) return a.center_id === selectedCenterId
        return true
      })
      .map(a => ({
        key: `d:${a.id}`,
        type: 'decommission',
        title: a.asset_name,
        subtitle: a.decommission_reason || a.center_name,
        id: a.id,
        meta: a.center_name,
        data: a,
      }))

    const xfer = transfers
      .filter(t => {
        if (t.status !== 'Pending Approval') return false
        if (user?.role === 'center_head') return t.from_center === user.center_id
        if (selectedCenterId) return t.from_center === selectedCenterId || t.to_center === selectedCenterId
        return true
      })
      .map(t => ({
        key: `t:${t.id}`,
        type: 'transfer',
        title: t.asset_name,
        subtitle: t.reason,
        id: t.id,
        meta: `${getCenterName(t.from_center)} → ${getCenterName(t.to_center)}`,
        data: t,
      }))

    let list = [...decomm, ...xfer]
    if (filterType) list = list.filter(r => r.type === filterType)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q) ||
        r.meta?.toLowerCase().includes(q)
      )
    }
    return list
  }, [assets, transfers, user, selectedCenterId, filterType, search])

  const selected = useMemo(
    () => rows.find(r => r.key === selectedKey) || null,
    [rows, selectedKey]
  )

  // Clear selection if item disappears after approve/reject
  useEffect(() => {
    if (selectedKey && !rows.some(r => r.key === selectedKey)) {
      setSelectedKey(null)
    }
  }, [rows, selectedKey])

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
              placeholder="Asset, ID, reason…"
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
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All</option>
            <option value="decommission">Decommission</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        {filterType && (
          <button type="button" onClick={() => setFilterType('')} className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1.5">
            Clear filters
          </button>
        )}
        <p className="ml-auto text-sm text-slate-500 self-center">
          <strong className="text-slate-700">{rows.length}</strong> pending
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className={`min-w-0 ${selected ? 'flex-1 w-full' : 'w-full'}`}>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-16rem)]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-violet-50 border-b border-violet-100">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Request</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">Detail</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center">
                        <ClipboardCheck size={48} className="mx-auto text-green-300 mb-4" />
                        <p className="text-slate-500 font-medium">All clear!</p>
                        <p className="text-slate-400 text-sm mt-1">No pending approvals</p>
                      </td>
                    </tr>
                  ) : rows.map(r => (
                    <tr
                      key={r.key}
                      onClick={() => setSelectedKey(r.key)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        selectedKey === r.key ? 'bg-violet-100/70' : 'hover:bg-violet-50/50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{r.title}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-56">{r.subtitle}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.type === 'decommission' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {r.type === 'decommission' ? 'Decommission' : 'Transfer'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{r.meta}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{r.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selected && (
          <ApprovalInspector
            item={selected}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </div>
  )
}
