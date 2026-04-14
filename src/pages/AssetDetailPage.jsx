import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, Edit, QrCode, ArrowLeftRight, Trash2,
  Package, MapPin, User, DollarSign, Calendar, Hash, Tag, Wrench
} from 'lucide-react'
import { useState } from 'react'
import QRModal from '../components/Assets/QRModal'
import DecommissionModal from '../components/Assets/DecommissionModal'

const STATUS_COLORS = {
  'Active': 'bg-green-100 text-green-700 border-green-200',
  'Under Maintenance': 'bg-blue-100 text-blue-700 border-blue-200',
  'Decommissioned': 'bg-red-100 text-red-700 border-red-200',
  'Pending Decommission': 'bg-amber-100 text-amber-700 border-amber-200',
  'Pending Transfer': 'bg-purple-100 text-purple-700 border-purple-200',
  'In Storage': 'bg-gray-100 text-gray-600 border-gray-200',
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function AssetDetailPage() {
  const { id } = useParams()
  const { assets, auditLogs } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(false)
  const [showDecomm, setShowDecomm] = useState(false)

  const asset = assets.find(a => a.id === id)

  if (!asset) {
    return (
      <div className="text-center py-24">
        <Package size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Asset not found</p>
        <button onClick={() => navigate('/assets')} className="mt-4 text-orange-500 hover:underline text-sm">← Back to register</button>
      </div>
    )
  }

  const assetLogs = auditLogs.filter(l => l.asset_id === id)
  const canEdit = user?.role !== 'auditor' && asset.status !== 'Decommissioned'

  const totalValue = (asset.purchase_value || 0) * (asset.quantity || 1)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-bold text-xl text-slate-800">{asset.asset_name}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
              {asset.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">{asset.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <QrCode size={15} />
            QR
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => navigate(`/assets/edit/${id}`)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-100 transition"
              >
                <Edit size={15} />
                Edit
              </button>
              {asset.status === 'Active' && (
                <button
                  onClick={() => navigate(`/transfers?asset=${id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 hover:bg-green-100 transition"
                >
                  <ArrowLeftRight size={15} />
                  Transfer
                </button>
              )}
              {!['Decommissioned', 'Pending Decommission'].includes(asset.status) && (
                <button
                  onClick={() => setShowDecomm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={15} />
                  Decommission
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Asset Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <div>
                <InfoRow icon={Tag} label="Category" value={asset.category} />
                <InfoRow icon={Tag} label="Sub-category" value={asset.sub_category} />
                <InfoRow icon={Package} label="Brand / Make" value={asset.make_brand} />
                <InfoRow icon={Hash} label="Model No." value={asset.model_no} />
                <InfoRow icon={Hash} label="Serial / Tag No." value={asset.serial_no} />
              </div>
              <div>
                <InfoRow icon={MapPin} label="Center" value={asset.center_name} />
                <InfoRow icon={MapPin} label="Location" value={asset.location} />
                <InfoRow icon={User} label="Custodian" value={asset.custodian} />
                <InfoRow icon={User} label="Department" value={asset.department} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Purchase & Warranty</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Calendar} label="Purchase Date" value={asset.purchase_date} />
              <InfoRow icon={DollarSign} label="Unit Value" value={asset.purchase_value ? `₹${asset.purchase_value.toLocaleString('en-IN')}` : null} />
              <InfoRow icon={DollarSign} label="Total Value" value={totalValue ? `₹${totalValue.toLocaleString('en-IN')}` : null} />
              <InfoRow icon={Package} label="Vendor" value={asset.vendor} />
              <InfoRow icon={Calendar} label="Warranty Expiry" value={asset.warranty_expiry} />
            </div>
          </div>

          {asset.notes && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">Remarks</h3>
              <p className="text-sm text-slate-600">{asset.notes}</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Quick Info</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Quantity</span>
              <span className="text-xl font-bold text-slate-800">{asset.quantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Condition</span>
              <span className={`text-sm font-semibold ${
                asset.condition === 'Good' ? 'text-green-600' :
                asset.condition === 'Fair' ? 'text-amber-600' : 'text-red-600'
              }`}>{asset.condition}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Last Verified</span>
              <span className="text-sm text-slate-700">{asset.last_verified || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Verified By</span>
              <span className="text-sm text-slate-700">{asset.verified_by || '—'}</span>
            </div>
          </div>

          {/* Change history */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Change History</h3>
            {assetLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No history recorded</p>
            ) : (
              <div className="space-y-3">
                {assetLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{log.action}</p>
                      <p className="text-xs text-slate-400">{log.user} · {new Date(log.timestamp).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showQR && <QRModal asset={asset} onClose={() => setShowQR(false)} />}
      {showDecomm && <DecommissionModal asset={asset} onClose={() => setShowDecomm(false)} />}
    </div>
  )
}
