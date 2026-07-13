import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CENTERS } from '../lib/mockData'
import {
  ArrowLeftRight, Plus, Check, X, Clock, Truck,
  ChevronRight, Package
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  'Pending Approval': 'bg-amber-100 text-amber-700',
  'In Transit': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
}

const STATUS_ICONS = {
  'Pending Approval': Clock,
  'In Transit': Truck,
  'Completed': Check,
  'Rejected': X,
}

function InitiateTransferModal({ onClose, initialAssetId }) {
  const { user } = useAuth()
  const { assets, initiateTransfer } = useData()
  const preselected = initialAssetId ? assets.find(a => a.id === initialAssetId) : null
  const [form, setForm] = useState({
    asset_id: preselected?.id || '',
    from_center: preselected?.center_id || user?.center_id || '',
    to_center: '',
    quantity: 1,
    reason: '',
    new_location: '',
    new_custodian: '',
  })

  const eligibleAssets = useMemo(() => {
    return assets.filter(a => {
      const centerMatch = user?.role === 'center_head' || user?.role === 'center_staff'
        ? a.center_id === user.center_id
        : a.center_id === form.from_center
      return centerMatch && a.status === 'Active'
    })
  }, [assets, user, form.from_center])

  const selectedAsset = assets.find(a => a.id === form.asset_id)
  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.asset_id || !form.to_center || !form.reason) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.from_center === form.to_center) {
      toast.error('Source and destination centers cannot be the same')
      return
    }
    const asset = assets.find(a => a.id === form.asset_id)
    initiateTransfer({
      ...form,
      asset_name: asset?.asset_name || form.asset_id,
    }, user)
    toast.success('Transfer request submitted successfully')
    onClose()
  }

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">Initiate Transfer</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {canChangeCenter && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">From Center *</label>
              <select value={form.from_center} onChange={e => setForm(f => ({ ...f, from_center: e.target.value, asset_id: '' }))} className={inputCls}>
                <option value="">Select source center…</option>
                {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className={inputCls}>
              <option value="">Select asset…</option>
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
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Destination Center *</label>
            <select value={form.to_center} onChange={e => setForm(f => ({ ...f, to_center: e.target.value }))} className={inputCls}>
              <option value="">Select destination…</option>
              {CENTERS.filter(c => c.id !== (form.from_center || user?.center_id)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">New Location at Destination</label>
            <input type="text" value={form.new_location} onChange={e => setForm(f => ({ ...f, new_location: e.target.value }))} placeholder="e.g. Lab 1, 2nd Floor" className={inputCls} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">New Custodian at Destination</label>
            <input type="text" value={form.new_custodian} onChange={e => setForm(f => ({ ...f, new_custodian: e.target.value }))} placeholder="Staff member at destination" className={inputCls} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Reason *</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Why is this transfer needed?"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition">
              Submit Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TransfersPage() {
  const { user } = useAuth()
  const { transfers, assets, approveTransfer, completeTransfer } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [prefillAssetId, setPrefillAssetId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const canApprove = user?.role === 'super_admin' || user?.role === 'ops_admin'
  const canInitiate = user?.role !== 'auditor'

  useEffect(() => {
    const assetId = searchParams.get('asset')
    if (!assetId || !canInitiate) return
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return
    setPrefillAssetId(assetId)
    setShowModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('asset')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, assets, canInitiate])

  const visible = useMemo(() => {
    let list = transfers
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(t => t.from_center === user.center_id || t.to_center === user.center_id)
    }
    if (filterStatus) list = list.filter(t => t.status === filterStatus)
    return list
  }, [transfers, user, filterStatus])

  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-1">
          {['', 'Pending Approval', 'In Transit', 'Completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        {canInitiate && (
          <button
            onClick={() => { setPrefillAssetId(''); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus size={15} />
            New Transfer
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
            <ArrowLeftRight size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">No transfers found</p>
          </div>
        ) : visible.map(transfer => {
          const StatusIcon = STATUS_ICONS[transfer.status] || Clock
          const isDestination = transfer.to_center === user?.center_id
          const isSource = transfer.from_center === user?.center_id
          const canConfirmReceipt = isDestination && transfer.status === 'In Transit' && (user?.role === 'center_head' || user?.role === 'center_staff')

          return (
            <div key={transfer.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <ArrowLeftRight size={20} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{transfer.asset_name}</p>
                      <span className="font-mono text-xs text-slate-400">{transfer.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                      <span className="font-medium">{getCenterName(transfer.from_center)}</span>
                      <ChevronRight size={14} className="text-slate-400" />
                      <span className="font-medium text-blue-600">{getCenterName(transfer.to_center)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{transfer.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      {transfer.initiated_by && <span>By: {transfer.initiated_by}</span>}
                      {transfer.approved_by && <span>Approved: {transfer.approved_by}</span>}
                      {transfer.dispatched_date && <span>Dispatched: {transfer.dispatched_date}</span>}
                      {transfer.received_date && <span>Received: {transfer.received_date}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[transfer.status] || 'bg-gray-100 text-gray-600'}`}>
                    <StatusIcon size={11} />
                    {transfer.status}
                  </span>

                  {canApprove && transfer.status === 'Pending Approval' && (
                    <button
                      onClick={() => { approveTransfer(transfer.id, user); toast.success('Transfer approved') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-semibold transition"
                    >
                      <Check size={13} />
                      Approve
                    </button>
                  )}

                  {canConfirmReceipt && (
                    <button
                      onClick={() => { completeTransfer(transfer.id, user); toast.success('Receipt confirmed! Asset record updated.') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                    >
                      <Package size={13} />
                      Confirm Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <InitiateTransferModal
          initialAssetId={prefillAssetId}
          onClose={() => { setShowModal(false); setPrefillAssetId('') }}
        />
      )}
    </div>
  )
}
