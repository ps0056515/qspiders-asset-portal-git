import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CATEGORIES, CENTERS, CONDITIONS, STATUSES } from '../lib/mockData'
import { Save, ArrowLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  asset_name: '', category: '', sub_category: '', make_brand: '', model_no: '',
  serial_no: '', center_id: '', location: '', quantity: 1, condition: 'Good',
  status: 'Active', purchase_date: '', purchase_value: '', vendor: '',
  warranty_expiry: '', custodian: '', department: '', notes: '',
}

const inputCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 bg-white transition'

function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function AddEditAssetPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const { assets, addAsset, updateAsset } = useData()
  const navigate = useNavigate()

  const [form, setForm] = useState(() => {
    if (isEdit) {
      const a = assets.find(x => x.id === id)
      return a ? { ...EMPTY_FORM, ...a } : EMPTY_FORM
    }
    return {
      ...EMPTY_FORM,
      center_id: user?.center_id || '',
      custodian: user?.name || '',
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showMore, setShowMore] = useState(isEdit)

  const subCategories = CATEGORIES.find(c => c.name === form.category)?.subcategories || []
  const canChangeCenter = user?.role === 'super_admin' || user?.role === 'ops_admin'

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.asset_name?.trim()) errs.asset_name = 'Name is required'
    if (!form.category) errs.category = 'Pick a category'
    if (!form.center_id) errs.center_id = 'Center is required'
    if (!form.location?.trim()) errs.location = 'Location is required'
    if (!form.custodian?.trim()) errs.custodian = 'Custodian is required'
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Must be at least 1'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please complete the required fields')
      return
    }

    setSubmitting(true)
    try {
      const center = CENTERS.find(c => c.id === form.center_id)
      const payload = { ...form, center_name: center?.name || form.center_name || '' }
      if (isEdit) {
        await updateAsset(id, payload, user)
        toast.success('Asset updated')
      } else {
        const created = await addAsset(payload, user)
        toast.success(created?.id ? `Registered · ${created.id}` : 'Asset registered')
      }
      navigate('/assets')
    } catch (err) {
      toast.error(err?.message || 'Could not save asset')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {isEdit ? 'Edit asset' : 'New asset'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? 'Update the details below.' : 'Only the essentials — add more if you need.'}
            </p>
          </div>
        </div>

        {!isEdit && (
          <Link
            to="/scan"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-2 rounded-xl transition"
          >
            <Sparkles size={14} />
            Scan instead
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identity */}
        <section className="space-y-5">
          <Field label="Asset name" required error={errors.asset_name}>
            <input
              type="text"
              autoFocus={!isEdit}
              value={form.asset_name}
              onChange={e => set('asset_name', e.target.value)}
              placeholder="e.g. Dell OptiPlex 7090"
              className={`${inputCls} text-base ${errors.asset_name ? 'border-red-400' : ''}`}
            />
          </Field>

          <Field label="Category" required error={errors.category}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const active = form.category === c.name
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      set('category', c.name)
                      set('sub_category', '')
                    }}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${
                      active
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-700'
                    }`}
                  >
                    {c.name.split('&')[0].trim()}
                  </button>
                )
              })}
            </div>
          </Field>

          {form.category && (
            <Field label="Sub-category" hint="Optional">
              <div className="flex flex-wrap gap-2">
                {subCategories.map(s => {
                  const active = form.sub_category === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('sub_category', active ? '' : s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}
        </section>

        {/* Where & who */}
        <section className="rounded-2xl bg-slate-50/80 border border-slate-100 p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Where it lives</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Center" required error={errors.center_id}>
              <select
                value={form.center_id}
                onChange={e => set('center_id', e.target.value)}
                disabled={!canChangeCenter && Boolean(user?.center_id)}
                className={`${inputCls} ${errors.center_id ? 'border-red-400' : ''}`}
              >
                <option value="">Select center…</option>
                {CENTERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Location / room" required error={errors.location}>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Lab 1, 2nd Floor"
                className={`${inputCls} ${errors.location ? 'border-red-400' : ''}`}
              />
            </Field>

            <Field label="Custodian" required error={errors.custodian}>
              <input
                type="text"
                value={form.custodian}
                onChange={e => set('custodian', e.target.value)}
                placeholder="Person responsible"
                className={`${inputCls} ${errors.custodian ? 'border-red-400' : ''}`}
              />
            </Field>

            <Field label="Quantity" required error={errors.quantity}>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value, 10) || 1)}
                className={`${inputCls} ${errors.quantity ? 'border-red-400' : ''}`}
              />
            </Field>
          </div>

          <Field label="Condition">
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => {
                const active = form.condition === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('condition', c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      active
                        ? c === 'Good'
                          ? 'bg-green-500 text-white border-green-500'
                          : c === 'Fair'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </Field>
        </section>

        {/* More details */}
        <section>
          <button
            type="button"
            onClick={() => setShowMore(v => !v)}
            className="w-full flex items-center justify-between px-1 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <span>{showMore ? 'Hide extra details' : 'Add brand, purchase & notes'}</span>
            {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showMore && (
            <div className="mt-3 space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Brand">
                  <input type="text" value={form.make_brand} onChange={e => set('make_brand', e.target.value)} placeholder="HP, Dell…" className={inputCls} />
                </Field>
                <Field label="Model">
                  <input type="text" value={form.model_no} onChange={e => set('model_no', e.target.value)} placeholder="Model number" className={inputCls} />
                </Field>
                <Field label="Serial / tag">
                  <input type="text" value={form.serial_no} onChange={e => set('serial_no', e.target.value)} placeholder="Serial number" className={inputCls} />
                </Field>
                <Field label="Department">
                  <input type="text" value={form.department} onChange={e => set('department', e.target.value)} placeholder="IT, Admin…" className={inputCls} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    {STATUSES.filter(s => !['Pending Decommission', 'Pending Transfer'].includes(s)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Vendor">
                  <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Supplier" className={inputCls} />
                </Field>
                <Field label="Purchase date">
                  <input type="date" value={form.purchase_date || ''} onChange={e => set('purchase_date', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Purchase value (₹)">
                  <input type="number" min={0} value={form.purchase_value ?? ''} onChange={e => set('purchase_value', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0" className={inputCls} />
                </Field>
                <Field label="Warranty expiry" className="sm:col-span-2">
                  <input type="date" value={form.warranty_expiry || ''} onChange={e => set('warranty_expiry', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Anything else worth noting…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 -mx-1 px-1 pt-4 pb-2 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent">
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isEdit ? 'Save changes' : 'Register asset'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
