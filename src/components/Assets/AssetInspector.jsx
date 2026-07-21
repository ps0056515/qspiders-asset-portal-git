import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  X, Save, Printer, AlertTriangle, QrCode, Pencil, Trash2, Package
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { CATEGORIES, CENTERS, CONDITIONS, STATUSES } from '../../lib/mockData'

const STATUS_COLORS = {
  'Active': 'bg-green-100 text-green-700',
  'Under Maintenance': 'bg-blue-100 text-blue-700',
  'In Storage': 'bg-gray-100 text-gray-600',
  'Decommissioned': 'bg-red-100 text-red-600',
  'Pending Decommission': 'bg-amber-100 text-amber-700',
  'Pending Transfer': 'bg-purple-100 text-purple-700',
}

const REASONS = [
  'Damaged beyond repair',
  'Lost / Stolen',
  'Transferred (external)',
  'Obsolete / End of life',
  'Duplicate entry',
  'Donated / Gifted',
  'Sold / Disposed',
]

const EMPTY_FORM = {
  asset_name: '', category: '', sub_category: '', make_brand: '', model_no: '',
  serial_no: '', center_id: '', location: '', quantity: 1, condition: 'Good',
  status: 'Active', purchase_date: '', purchase_value: '', vendor: '',
  warranty_expiry: '', custodian: '', department: '', notes: '',
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white transition'

/**
 * Inline inspector panel (not a modal). Modes: view | qr | edit | add | decommission
 */
export default function AssetInspector({
  mode,
  asset,
  onClose,
  onModeChange,
}) {
  const { user } = useAuth()
  const { addAsset, updateAsset, requestDecommission } = useData()
  const qrRef = useRef(null)

  const canEdit = user?.role !== 'auditor'
  const canDelete = ['super_admin', 'ops_admin', 'center_head', 'center_staff'].includes(user?.role)
  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (mode === 'add') {
      setForm({
        ...EMPTY_FORM,
        center_id: user?.center_id || '',
        custodian: user?.name || '',
      })
    } else if (asset && (mode === 'edit' || mode === 'view' || mode === 'qr' || mode === 'decommission')) {
      setForm({ ...EMPTY_FORM, ...asset })
    }
    setErrors({})
    setReason('')
    setNotes('')
  }, [mode, asset, user])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const subCategories = useMemo(
    () => CATEGORIES.find(c => c.name === form.category)?.subcategories || [],
    [form.category]
  )

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.asset_name?.trim()) errs.asset_name = 'Required'
    if (!form.category) errs.category = 'Required'
    if (!form.center_id) errs.center_id = 'Required'
    if (!form.location?.trim()) errs.location = 'Required'
    if (!form.custodian?.trim()) errs.custodian = 'Required'
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Min 1'
    return errs
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error('Please complete required fields')
      return
    }
    setSubmitting(true)
    try {
      const center = CENTERS.find(c => c.id === form.center_id)
      const payload = { ...form, center_name: center?.name || form.center_name || '' }
      if (mode === 'edit' && asset) {
        await updateAsset(asset.id, payload, user)
        toast.success('Asset updated')
        onModeChange('view')
      } else {
        const created = await addAsset(payload, user)
        toast.success(typeof created === 'string' ? `Registered · ${created}` : 'Asset registered')
        onClose()
      }
    } catch (err) {
      toast.error(err?.message || 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecommission = async (e) => {
    e.preventDefault()
    if (!reason || !asset) return
    setSubmitting(true)
    try {
      await requestDecommission(asset.id, reason + (notes ? ` — ${notes}` : ''), user)
      toast.success('Decommission request submitted')
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    if (!asset) return
    const printContent = `
      <html><head><title>QR - ${asset.id}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .sticker { border: 2px dashed #ccc; padding: 16px; text-align: center; width: 200px; }
        .asset-id { font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 8px; }
        .asset-name { font-size: 10px; color: #555; margin-top: 4px; }
        .center { font-size: 9px; color: #888; margin-top: 2px; }
      </style></head>
      <body>
        <div class="sticker">
          ${qrRef.current?.innerHTML || ''}
          <div class="asset-id">${asset.id}</div>
          <div class="asset-name">${asset.asset_name}</div>
          <div class="center">${asset.center_name}</div>
        </div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(printContent)
    win.document.close()
    win.print()
  }

  const title = {
    view: 'Asset details',
    qr: 'QR code',
    edit: 'Edit asset',
    add: 'New asset',
    decommission: 'Decommission',
  }[mode] || 'Asset'

  return (
    <aside className="w-full lg:w-[380px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/80">
        <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-violet-100 rounded-lg transition" title="Close (Esc)">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {/* VIEW */}
        {mode === 'view' && asset && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-slate-800">{asset.asset_name}</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{asset.id}</p>
              <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                {asset.status}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Category', asset.category],
                ['Center', asset.center_name],
                ['Location', asset.location],
                ['Condition', asset.condition],
                ['Custodian', asset.custodian],
                ['Brand', asset.make_brand || '—'],
                ['Model', asset.model_no || '—'],
                ['Serial', asset.serial_no || '—'],
                ['Qty', asset.quantity],
                ['Last verified', asset.last_verified || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium truncate">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => onModeChange('qr')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition"
              >
                <QrCode size={14} /> QR
              </button>
              {canEdit && asset.status !== 'Decommissioned' && (
                <button
                  type="button"
                  onClick={() => onModeChange('edit')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              {canDelete && !['Decommissioned', 'Pending Decommission'].includes(asset.status) && (
                <button
                  type="button"
                  onClick={() => onModeChange('decommission')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> Decommission
                </button>
              )}
            </div>
          </div>
        )}

        {/* QR */}
        {mode === 'qr' && asset && (
          <div className="flex flex-col items-center gap-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center w-48">
              <div ref={qrRef} className="flex justify-center">
                <QRCodeSVG
                  value={`QS-ASSET::${asset.id}::${asset.asset_name}`}
                  size={130}
                  level="M"
                  includeMargin={false}
                  fgColor="#1e293b"
                />
              </div>
              <p className="font-mono text-[10px] font-bold mt-2 text-slate-700 break-all">{asset.id}</p>
              <p className="text-[9px] text-slate-500 mt-1">{asset.asset_name}</p>
            </div>
            <p className="text-xs text-slate-400 text-center">Print size ~3cm × 3cm · sticker paper</p>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Printer size={15} /> Print sticker
            </button>
            <button type="button" onClick={() => onModeChange('view')} className="text-sm text-violet-600 hover:underline">
              ← Back to details
            </button>
          </div>
        )}

        {/* DECOMMISSION */}
        {mode === 'decommission' && asset && (
          <form onSubmit={handleDecommission} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{asset.asset_name}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{asset.id}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Sends a request for Ops Admin approval. Status becomes <strong>Pending Decommission</strong>.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Reason *</p>
              {REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={e => setReason(e.target.value)}
                    className="accent-violet-600"
                  />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => onModeChange('view')} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || submitting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </form>
        )}

        {/* ADD / EDIT form */}
        {(mode === 'add' || mode === 'edit') && (
          <form onSubmit={handleSave} className="space-y-4">
            {mode === 'add' && (
              <div className="flex items-center gap-2 text-violet-700 bg-violet-50 rounded-lg px-3 py-2 text-xs font-medium">
                <Package size={14} /> Register a new asset inline
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name *</label>
              <input
                type="text"
                value={form.asset_name}
                onChange={e => set('asset_name', e.target.value)}
                className={`${inputCls} mt-1 ${errors.asset_name ? 'border-red-400' : ''}`}
                placeholder="e.g. Dell OptiPlex"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category *</label>
              <select
                value={form.category}
                onChange={e => { set('category', e.target.value); set('sub_category', '') }}
                className={`${inputCls} mt-1 ${errors.category ? 'border-red-400' : ''}`}
              >
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {subCategories.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-category</label>
                <select
                  value={form.sub_category}
                  onChange={e => set('sub_category', e.target.value)}
                  className={`${inputCls} mt-1`}
                >
                  <option value="">Optional…</option>
                  {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Center *</label>
                <select
                  value={form.center_id}
                  onChange={e => set('center_id', e.target.value)}
                  disabled={!canChangeCenter && Boolean(user?.center_id)}
                  className={`${inputCls} mt-1 ${errors.center_id ? 'border-red-400' : ''}`}
                >
                  <option value="">Select…</option>
                  {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  className={`${inputCls} mt-1 ${errors.location ? 'border-red-400' : ''}`}
                  placeholder="Lab 1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custodian *</label>
                <input
                  type="text"
                  value={form.custodian}
                  onChange={e => set('custodian', e.target.value)}
                  className={`${inputCls} mt-1 ${errors.custodian ? 'border-red-400' : ''}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty *</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={e => set('quantity', parseInt(e.target.value, 10) || 1)}
                  className={`${inputCls} mt-1 ${errors.quantity ? 'border-red-400' : ''}`}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Condition</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={`${inputCls} mt-1`}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inputCls} mt-1`}>
                {STATUSES.filter(s => !['Pending Decommission', 'Pending Transfer'].includes(s)).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Brand</label>
                <input type="text" value={form.make_brand} onChange={e => set('make_brand', e.target.value)} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</label>
                <input type="text" value={form.model_no} onChange={e => set('model_no', e.target.value)} className={`${inputCls} mt-1`} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial</label>
                <input type="text" value={form.serial_no} onChange={e => set('serial_no', e.target.value)} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
              <button
                type="button"
                onClick={() => (mode === 'edit' ? onModeChange('view') : onClose())}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {mode === 'edit' ? 'Save' : 'Register'}
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  )
}
