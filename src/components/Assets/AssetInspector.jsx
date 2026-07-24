import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  X, Save, Printer, AlertTriangle, QrCode, Pencil, Trash2, Package,
  Upload, FileText, Image as ImageIcon
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

const OTHER = '__other__'

const EMPTY_FORM = {
  asset_name: '', category: '', sub_category: '', make_brand: '', model_no: '',
  serial_no: '', center_id: '', location: '', quantity: 1, condition: 'Good',
  status: 'Active', purchase_date: '', purchase_value: '', vendor: '',
  warranty_start: '', warranty_expiry: '', custodian: '', department: '', notes: '',
  asset_type: 'common', employee_name: '', employee_id: '',
  photo_url: '', invoice_url: '',
}

const CUSTOM_CAT_KEY = 'qs_custom_categories'

function loadCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CAT_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCustomCategory(name, subcategory) {
  const list = loadCustomCategories()
  let entry = list.find(c => c.name.toLowerCase() === name.toLowerCase())
  if (!entry) {
    entry = { id: `CUSTOM-${Date.now()}`, name, subcategories: [] }
    list.push(entry)
  }
  if (subcategory && !entry.subcategories.some(s => s.toLowerCase() === subcategory.toLowerCase())) {
    entry.subcategories.push(subcategory)
  }
  localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(list))
  return list
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white transition'

async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data
}

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
  const { assets, addAsset, updateAsset, requestDecommission } = useData()
  const qrRef = useRef(null)
  const photoInputRef = useRef(null)
  const invoiceInputRef = useRef(null)

  const canEdit = user?.role !== 'auditor'
  const canDelete = ['super_admin', 'ops_admin', 'center_head', 'center_staff'].includes(user?.role)
  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [subCategoryChoice, setSubCategoryChoice] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [customSubCategory, setCustomSubCategory] = useState('')
  const [customCats, setCustomCats] = useState(() => loadCustomCategories())

  useEffect(() => {
    if (mode === 'add') {
      setForm({
        ...EMPTY_FORM,
        center_id: user?.center_id || '',
        custodian: user?.name || '',
        asset_type: 'common',
      })
      setCategoryChoice('')
      setSubCategoryChoice('')
      setCustomCategory('')
      setCustomSubCategory('')
    } else if (asset && (mode === 'edit' || mode === 'view' || mode === 'qr' || mode === 'decommission')) {
      const toDate = (v) => {
        if (!v) return ''
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !v.includes('T')) return v.slice(0, 10)
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return ''
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      setForm({
        ...EMPTY_FORM,
        ...asset,
        asset_type: asset.asset_type === 'employee' ? 'employee' : 'common',
        employee_name: asset.employee_name || '',
        employee_id: asset.employee_id || '',
        photo_url: asset.photo_url || '',
        invoice_url: asset.invoice_url || '',
        warranty_start: toDate(asset.warranty_start),
        warranty_expiry: toDate(asset.warranty_expiry),
        purchase_date: toDate(asset.purchase_date),
      })
      const known = [...CATEGORIES, ...loadCustomCategories()].some(c => c.name === asset.category)
      const fromAssets = assets.some(a => a.category === asset.category && a.id !== asset.id)
      if (known || fromAssets || CATEGORIES.some(c => c.name === asset.category)) {
        setCategoryChoice(asset.category || '')
        setCustomCategory('')
      } else if (asset.category) {
        setCategoryChoice(OTHER)
        setCustomCategory(asset.category)
      } else {
        setCategoryChoice('')
        setCustomCategory('')
      }
      const cat = [...CATEGORIES, ...loadCustomCategories()].find(c => c.name === asset.category)
      const subs = cat?.subcategories || []
      if (asset.sub_category && !subs.includes(asset.sub_category)) {
        setSubCategoryChoice(OTHER)
        setCustomSubCategory(asset.sub_category)
      } else {
        setSubCategoryChoice(asset.sub_category || '')
        setCustomSubCategory('')
      }
    }
    setErrors({})
    setReason('')
    setNotes('')
  }, [mode, asset, user, assets])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const allCategories = useMemo(() => {
    const base = [...CATEGORIES]
    const names = new Set(base.map(c => c.name))
    for (const c of customCats) {
      if (!names.has(c.name)) {
        base.push(c)
        names.add(c.name)
      }
    }
    for (const a of assets || []) {
      if (a.category && !names.has(a.category)) {
        const subs = [...new Set(
          (assets || []).filter(x => x.category === a.category).map(x => x.sub_category).filter(Boolean)
        )]
        base.push({ id: `dyn-${a.category}`, name: a.category, subcategories: subs })
        names.add(a.category)
      }
    }
    return base
  }, [assets, customCats])

  const subCategories = useMemo(() => {
    if (categoryChoice === OTHER) return []
    return allCategories.find(c => c.name === categoryChoice)?.subcategories || []
  }, [allCategories, categoryChoice])

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const resolveCategory = () => {
    if (categoryChoice === OTHER) return customCategory.trim()
    return categoryChoice
  }

  const resolveSubCategory = () => {
    if (categoryChoice === OTHER || subCategoryChoice === OTHER) return customSubCategory.trim()
    return subCategoryChoice
  }

  const validate = () => {
    const errs = {}
    if (!form.asset_name?.trim()) errs.asset_name = 'Required'
    const cat = resolveCategory()
    if (!cat) errs.category = 'Required'
    if (categoryChoice === OTHER && !customCategory.trim()) errs.customCategory = 'Required'
    if (subCategoryChoice === OTHER && !customSubCategory.trim()) errs.customSubCategory = 'Required'
    if (!form.center_id) errs.center_id = 'Required'
    if (!form.location?.trim()) errs.location = 'Required'
    if (!form.custodian?.trim()) errs.custodian = 'Required'
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Min 1'
    if (!form.asset_type) errs.asset_type = 'Required'
    if (form.asset_type === 'employee') {
      if (!form.employee_name?.trim()) errs.employee_name = 'Required'
      if (!form.employee_id?.trim()) errs.employee_id = 'Required'
    }
    if (form.warranty_start && form.warranty_expiry && form.warranty_expiry < form.warranty_start) {
      errs.warranty_expiry = 'Must be on or after start date'
    }
    return errs
  }

  const handleUpload = async (kind, file) => {
    if (!file) return
    setUploading(kind)
    try {
      const data = await uploadFile(file)
      set(kind === 'photo' ? 'photo_url' : 'invoice_url', data.url)
      toast.success(kind === 'photo' ? 'Photo uploaded' : 'Invoice uploaded')
    } catch (err) {
      toast.error(err?.message || 'Upload failed')
    } finally {
      setUploading(null)
    }
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
      const category = resolveCategory()
      const sub_category = resolveSubCategory()
      if (categoryChoice === OTHER || (subCategoryChoice === OTHER && category)) {
        setCustomCats(saveCustomCategory(category, sub_category || undefined))
      } else if (sub_category && category) {
        // Persist newly typed subcategory under known category when using Other on sub only
        if (subCategoryChoice === OTHER) {
          setCustomCats(saveCustomCategory(category, sub_category))
        }
      }

      const center = CENTERS.find(c => c.id === form.center_id)
      const payload = {
        ...form,
        category,
        sub_category: sub_category || '',
        center_name: center?.name || form.center_name || '',
        employee_name: form.asset_type === 'employee' ? form.employee_name : '',
        employee_id: form.asset_type === 'employee' ? form.employee_id : '',
        custodian: form.asset_type === 'employee' && form.employee_name
          ? form.employee_name
          : form.custodian,
      }
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
    <aside className="w-full lg:w-[420px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
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
            {asset.photo_url && (
              <img
                src={asset.photo_url}
                alt={asset.asset_name}
                className="w-full h-36 object-cover rounded-lg border border-slate-100"
              />
            )}
            <div>
              <p className="text-base font-semibold text-slate-800">{asset.asset_name}</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{asset.id}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                  {asset.status}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                  {asset.asset_type === 'employee' ? 'Employee Asset' : 'Common Asset'}
                </span>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Category', asset.category],
                ['Sub-category', asset.sub_category || '—'],
                ['Center', asset.center_name],
                ['Location', asset.location],
                ['Condition', asset.condition],
                ['Custodian', asset.custodian],
                ...(asset.asset_type === 'employee'
                  ? [['Employee', asset.employee_name], ['Employee ID', asset.employee_id]]
                  : []),
                ['Brand', asset.make_brand || '—'],
                ['Model', asset.model_no || '—'],
                ['Serial', asset.serial_no || '—'],
                ['Qty', asset.quantity],
                ['Warranty start', asset.warranty_start || '—'],
                ['Warranty expiry', asset.warranty_expiry || '—'],
                ['Last verified', asset.last_verified || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-slate-700 text-right font-medium truncate">{val}</dd>
                </div>
              ))}
            </dl>
            {asset.invoice_url && (
              <a
                href={asset.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:underline"
              >
                <FileText size={13} /> View invoice attachment
              </a>
            )}
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
              <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 text-violet-700 text-xs font-medium">
                  <Package size={14} /> Register a new asset
                </div>
                <p className="text-[11px] text-violet-600/80">
                  A unique Asset ID is generated automatically on save (format QS-Center-Category-####).
                </p>
              </div>
            )}
            {mode === 'edit' && asset?.id && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset ID</label>
                <p className="mt-1 font-mono text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {asset.id}
                </p>
              </div>
            )}

            {/* Asset type */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset type *</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {[
                  { value: 'common', label: 'Common Asset' },
                  { value: 'employee', label: 'Employee Asset' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      set('asset_type', opt.value)
                      if (opt.value === 'common') {
                        set('employee_name', '')
                        set('employee_id', '')
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                      form.asset_type === opt.value
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.asset_type === 'employee' && (
              <div className="grid grid-cols-1 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee Name *</label>
                  <input
                    type="text"
                    value={form.employee_name}
                    onChange={e => {
                      set('employee_name', e.target.value)
                      set('custodian', e.target.value)
                    }}
                    className={`${inputCls} mt-1 ${errors.employee_name ? 'border-red-400' : ''}`}
                    placeholder="Full name"
                  />
                  {errors.employee_name && <p className="text-xs text-red-500 mt-1">{errors.employee_name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee ID *</label>
                  <input
                    type="text"
                    value={form.employee_id}
                    onChange={e => set('employee_id', e.target.value)}
                    className={`${inputCls} mt-1 ${errors.employee_id ? 'border-red-400' : ''}`}
                    placeholder="e.g. EMP-1024"
                  />
                  {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id}</p>}
                </div>
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

            {/* Category + Other */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category *</label>
              <select
                value={categoryChoice}
                onChange={e => {
                  const v = e.target.value
                  setCategoryChoice(v)
                  setSubCategoryChoice('')
                  setCustomSubCategory('')
                  setErrors(err => ({ ...err, category: undefined, customCategory: undefined }))
                  if (v !== OTHER) {
                    setCustomCategory('')
                    set('category', v)
                    set('sub_category', '')
                  } else {
                    set('category', '')
                    set('sub_category', '')
                  }
                }}
                className={`${inputCls} mt-1 ${errors.category || errors.customCategory ? 'border-red-400' : ''}`}
              >
                <option value="">Select…</option>
                {allCategories.map(c => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
                <option value={OTHER}>Other (create new)…</option>
              </select>
              {categoryChoice === OTHER && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => {
                    setCustomCategory(e.target.value)
                    setErrors(err => ({ ...err, customCategory: undefined, category: undefined }))
                  }}
                  className={`${inputCls} mt-2 ${errors.customCategory ? 'border-red-400' : ''}`}
                  placeholder="Enter new category name"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-category</label>
              {categoryChoice === OTHER ? (
                <input
                  type="text"
                  value={customSubCategory}
                  onChange={e => setCustomSubCategory(e.target.value)}
                  className={`${inputCls} mt-1`}
                  placeholder="Optional new sub-category"
                />
              ) : (
                <>
                  <select
                    value={subCategoryChoice}
                    onChange={e => {
                      const v = e.target.value
                      setSubCategoryChoice(v)
                      if (v !== OTHER) {
                        setCustomSubCategory('')
                        set('sub_category', v)
                      } else {
                        set('sub_category', '')
                      }
                    }}
                    disabled={!categoryChoice}
                    className={`${inputCls} mt-1`}
                  >
                    <option value="">Optional…</option>
                    {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                    {categoryChoice && <option value={OTHER}>Other (create new)…</option>}
                  </select>
                  {subCategoryChoice === OTHER && (
                    <input
                      type="text"
                      value={customSubCategory}
                      onChange={e => {
                        setCustomSubCategory(e.target.value)
                        setErrors(err => ({ ...err, customSubCategory: undefined }))
                      }}
                      className={`${inputCls} mt-2 ${errors.customSubCategory ? 'border-red-400' : ''}`}
                      placeholder="Enter new sub-category"
                    />
                  )}
                </>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-3">
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

            {/* Warranty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warranty Start</label>
                <input
                  type="date"
                  value={form.warranty_start || ''}
                  onChange={e => set('warranty_start', e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warranty Expiry</label>
                <input
                  type="date"
                  value={form.warranty_expiry || ''}
                  onChange={e => set('warranty_expiry', e.target.value)}
                  className={`${inputCls} mt-1 ${errors.warranty_expiry ? 'border-red-400' : ''}`}
                />
                {errors.warranty_expiry && <p className="text-xs text-red-500 mt-1">{errors.warranty_expiry}</p>}
              </div>
            </div>

            {/* Optional uploads */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset Photo</label>
                <p className="text-[11px] text-slate-400 mb-1">Optional</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleUpload('photo', e.target.files?.[0])}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={uploading === 'photo'}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                  >
                    <ImageIcon size={14} />
                    {uploading === 'photo' ? 'Uploading…' : form.photo_url ? 'Replace photo' : 'Upload photo'}
                  </button>
                  {form.photo_url && (
                    <button type="button" onClick={() => set('photo_url', '')} className="text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                {form.photo_url && (
                  <img src={form.photo_url} alt="Asset" className="mt-2 h-24 w-full object-cover rounded-lg border border-slate-100" />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice Attachment</label>
                <p className="text-[11px] text-slate-400 mb-1">Optional · PDF or image</p>
                <input
                  ref={invoiceInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={e => handleUpload('invoice', e.target.files?.[0])}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={uploading === 'invoice'}
                    onClick={() => invoiceInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploading === 'invoice' ? 'Uploading…' : form.invoice_url ? 'Replace invoice' : 'Upload invoice'}
                  </button>
                  {form.invoice_url && (
                    <>
                      <a href={form.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1">
                        <FileText size={12} /> View
                      </a>
                      <button type="button" onClick={() => set('invoice_url', '')} className="text-xs text-red-500 hover:underline">
                        Remove
                      </button>
                    </>
                  )}
                </div>
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
                disabled={submitting || Boolean(uploading)}
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
