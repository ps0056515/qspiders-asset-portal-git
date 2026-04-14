import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CENTERS } from '../lib/mockData'
import { ClipboardCheck, Check, X, AlertTriangle, ArrowLeftRight, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { assets, transfers, approveDecommission, approveTransfer } = useData()
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const pendingDecomm = useMemo(() => {
    return assets.filter(a => {
      if (a.status !== 'Pending Decommission') return false
      if (user?.role === 'center_head') return a.center_id === user.center_id
      return true
    })
  }, [assets, user])

  const pendingTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (t.status !== 'Pending Approval') return false
      if (user?.role === 'center_head') return t.from_center === user.center_id
      return true
    })
  }, [transfers, user])

  const total = pendingDecomm.length + pendingTransfers.length

  const handleApproveDecomm = (asset) => {
    approveDecommission(asset.id, true, '', user)
    toast.success(`${asset.asset_name} decommissioned`)
  }

  const handleRejectDecomm = (asset) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    approveDecommission(asset.id, false, rejectReason, user)
    toast.success('Decommission request rejected')
    setRejectModal(null)
    setRejectReason('')
  }

  const getCenterName = (id) => CENTERS.find(c => c.id === id)?.name || id

  return (
    <div className="space-y-6">
      {total === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
          <ClipboardCheck size={48} className="mx-auto text-green-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">All clear!</p>
          <p className="text-slate-400 text-sm mt-1">No pending approvals at this time.</p>
        </div>
      ) : (
        <>
          {/* Decommission requests */}
          {pendingDecomm.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="font-semibold text-slate-800">Decommission Requests ({pendingDecomm.length})</h2>
              </div>
              <div className="grid gap-3">
                {pendingDecomm.map(asset => (
                  <div key={asset.id} className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-800">{asset.asset_name}</p>
                          <span className="font-mono text-xs text-slate-400">{asset.id}</span>
                        </div>
                        <p className="text-sm text-slate-600">{asset.center_name} · {asset.location}</p>
                        <p className="text-sm text-slate-600 mt-1">{asset.category} · {asset.condition}</p>
                        {asset.decommission_reason && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium text-amber-700">Reason: {asset.decommission_reason}</p>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-slate-400">
                          Value: ₹{((asset.purchase_value || 0) * (asset.quantity || 1)).toLocaleString('en-IN')} · Qty: {asset.quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setRejectModal(asset)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm font-semibold transition"
                        >
                          <X size={14} />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveDecomm(asset)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-semibold transition"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfer approvals */}
          {pendingTransfers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-blue-500" />
                <h2 className="font-semibold text-slate-800">Transfer Approvals ({pendingTransfers.length})</h2>
              </div>
              <div className="grid gap-3">
                {pendingTransfers.map(transfer => (
                  <div key={transfer.id} className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-800">{transfer.asset_name}</p>
                          <span className="font-mono text-xs text-slate-400">{transfer.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <span className="font-medium">{getCenterName(transfer.from_center)}</span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="font-medium text-blue-600">{getCenterName(transfer.to_center)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Requested by: {transfer.initiated_by}</p>
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-blue-700">Reason: {transfer.reason}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => { approveTransfer(transfer.id, user); toast.success('Transfer approved') }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-semibold transition flex-shrink-0"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Reject Decommission Request</h3>
            <p className="text-sm text-slate-500 mb-4">Asset: <strong>{rejectModal.asset_name}</strong></p>

            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Rejection reason *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected…"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectDecomm(rejectModal)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
