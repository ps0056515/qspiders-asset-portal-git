import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const REASONS = [
  'Damaged beyond repair',
  'Lost / Stolen',
  'Transferred (external)',
  'Obsolete / End of life',
  'Duplicate entry',
  'Donated / Gifted',
  'Sold / Disposed',
]

export default function DecommissionModal({ asset, onClose }) {
  const { user } = useAuth()
  const { requestDecommission } = useData()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reason) return
    requestDecommission(asset.id, reason + (notes ? ` — ${notes}` : ''), user)
    toast.success('Decommission request submitted. Awaiting admin approval.')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-slate-800">Request Decommission</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-amber-800">{asset.asset_name}</p>
            <p className="text-xs text-amber-600 mt-0.5">{asset.id} · {asset.center_name}</p>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            This will send a decommission request to the Ops Admin for approval. The asset will be marked as <strong>Pending Decommission</strong> until approved.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for removal *</label>
              <div className="space-y-2">
                {REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={e => setReason(e.target.value)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-slate-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context for the admin..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
