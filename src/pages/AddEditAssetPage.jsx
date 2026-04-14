import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CATEGORIES, CENTERS, CONDITIONS, STATUSES } from '../lib/mockData'
import { Save, ArrowLeft, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  asset_name: '', category: '', sub_category: '', make_brand: '', model_no: '',
  serial_no: '', center_id: '', location: '', quantity: 1, condition: 'Good',
  status: 'Active', purchase_date: '', purchase_value: '', vendor: '',
  warranty_expiry: '', custodian: '', department: '', notes: '',
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white transition"

export default function AddEditAssetPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const { assets, addAsset, updateAsset, centers } = useData()
  const navigate = useNavigate()

  const [form, setForm] = useState(() => {
    if (isEdit) {
      const a = assets.find(x => x.id === id)
      return a ? { ...a } : EMPTY_FORM
    }
    return { ...EMPTY_FORM, center_id: user?.center_id || '' }
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const subCategories = CATEGORIES.find(c => c.name === form.category)?.subcategories || []

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.asset_name) errs.asset_name = 'Required'
    if (!form.category) errs.category = 'Required'
    if (!form.center_id) errs.center_id = 'Required'
    if (!form.location) errs.location = 'Required'
    if (!form.custodian) errs.custodian = 'Required'
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Must be ≥ 1'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        updateAsset(id, form, user)
        toast.success('Asset updated successfully')
      } else {
        const newId = addAsset(form, user)
        toast.success(`Asset registered! ID: ${newId}`)
      }
      navigate('/assets')
    } finally {
      setSubmitting(false)
    }
  }

  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2">
          <Package size={20} className="text-orange-500" />
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Edit Asset' : 'Register New Asset'}</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Basic identity */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Basic Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField label="Asset Name" required>
                <input
                  type="text"
                  value={form.asset_name}
                  onChange={e => set('asset_name', e.target.value)}
                  placeholder="e.g. HP LaserJet Pro M404n"
                  className={`${inputCls} ${errors.asset_name ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                />
                {errors.asset_name && <p className="text-xs text-red-500 mt-1">{errors.asset_name}</p>}
              </FormField>
            </div>

            <FormField label="Category" required>
              <select
                value={form.category}
                onChange={e => { set('category', e.target.value); set('sub_category', '') }}
                className={`${inputCls} ${errors.category ? 'border-red-400' : ''}`}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FormField>

            <FormField label="Sub-category">
              <select
                value={form.sub_category}
                onChange={e => set('sub_category', e.target.value)}
                className={inputCls}
                disabled={!form.category}
              >
                <option value="">Select sub-category…</option>
                {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            <FormField label="Make / Brand">
              <input type="text" value={form.make_brand} onChange={e => set('make_brand', e.target.value)} placeholder="e.g. HP, Dell, Voltas" className={inputCls} />
            </FormField>

            <FormField label="Model No.">
              <input type="text" value={form.model_no} onChange={e => set('model_no', e.target.value)} placeholder="e.g. M404n" className={inputCls} />
            </FormField>

            <FormField label="Serial / Tag No.">
              <input type="text" value={form.serial_no} onChange={e => set('serial_no', e.target.value)} placeholder="Asset serial number" className={inputCls} />
            </FormField>
          </div>
        </div>

        {/* Section 2 — Location */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Center" required>
              <select
                value={form.center_id}
                onChange={e => set('center_id', e.target.value)}
                className={`${inputCls} ${errors.center_id ? 'border-red-400' : ''}`}
                disabled={!canChangeCenter && isEdit}
              >
                <option value="">Select center…</option>
                {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>

            <FormField label="Location / Room" required>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Lab 3, 2nd Floor"
                className={`${inputCls} ${errors.location ? 'border-red-400' : ''}`}
              />
            </FormField>
          </div>
        </div>

        {/* Section 3 — Quantity & Condition */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Quantity & Condition</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Quantity" required>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 1)}
                className={`${inputCls} ${errors.quantity ? 'border-red-400' : ''}`}
              />
            </FormField>

            <FormField label="Condition">
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={inputCls}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                {STATUSES.filter(s => !['Pending Decommission', 'Pending Transfer'].includes(s)).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Section 4 — Purchase info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Purchase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Purchase Date">
              <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} className={inputCls} />
            </FormField>

            <FormField label="Purchase Value (₹)">
              <input type="number" min={0} value={form.purchase_value} onChange={e => set('purchase_value', parseFloat(e.target.value) || '')} placeholder="0.00" className={inputCls} />
            </FormField>

            <FormField label="Vendor / Supplier">
              <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="e.g. HP India, Godrej Interio" className={inputCls} />
            </FormField>

            <FormField label="Warranty Expiry Date">
              <input type="date" value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} className={inputCls} />
            </FormField>
          </div>
        </div>

        {/* Section 5 — Responsibility */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Responsibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Custodian Name" required>
              <input
                type="text"
                value={form.custodian}
                onChange={e => set('custodian', e.target.value)}
                placeholder="Staff member responsible"
                className={`${inputCls} ${errors.custodian ? 'border-red-400' : ''}`}
              />
            </FormField>

            <FormField label="Department">
              <input type="text" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. IT, Admin, Facilities" className={inputCls} />
            </FormField>
          </div>
        </div>

        {/* Section 6 — Notes */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Remarks</h3>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any additional notes about this asset…"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 shadow-sm"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isEdit ? 'Save Changes' : 'Register Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}
