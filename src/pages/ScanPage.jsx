import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { CENTERS, CATEGORIES, CONDITIONS } from '../lib/mockData'
import {
  Camera, Upload, Scan, CheckCircle, AlertTriangle,
  Sparkles, ArrowRight, RotateCcw, Eye, EyeOff,
  ChevronDown, Save, Info, Zap, X
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ pct }) {
  const color = pct >= 80 ? 'bg-green-100 text-green-700 border-green-200'
    : pct >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200'
  const label = pct >= 80 ? 'High confidence' : pct >= 60 ? 'Medium confidence' : 'Low confidence'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
      <Zap size={13} />
      {pct}% — {label}
    </span>
  )
}

// ─── Field row: AI-filled (purple) vs human-required (amber) ─────────────────
function AIField({ label, value, aiProvided, children }) {
  return (
    <div className={`rounded-lg border p-3 ${aiProvided && value ? 'border-purple-200 bg-purple-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {aiProvided && value
          ? <Sparkles size={12} className="text-purple-500" />
          : <AlertTriangle size={12} className="text-amber-500" />
        }
        <span className={`text-xs font-semibold uppercase tracking-wide ${aiProvided && value ? 'text-purple-600' : 'text-amber-600'}`}>
          {label} {aiProvided && value ? '· AI filled' : '· Confirm required'}
        </span>
      </div>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"

// ─── Step 1: Capture screen ───────────────────────────────────────────────────
function CaptureStep({ onCapture }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Sparkles size={14} />
          AI-Powered Smart Scan
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Scan an Asset</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Point your camera at an asset and let AI identify it automatically — under 30 seconds.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
          ${dragging ? 'border-orange-400 bg-orange-50' : preview ? 'border-slate-200 cursor-default' : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50'}`}
        style={{ minHeight: 300 }}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Asset preview" className="w-full max-h-80 object-contain bg-slate-100" />
            <button
              onClick={e => { e.stopPropagation(); setPreview(null); setSelectedFile(null) }}
              className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm"
            >
              <X size={16} className="text-slate-600" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 rounded-full px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {selectedFile?.name}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
              <Camera size={28} className="text-orange-500" />
            </div>
            <p className="font-semibold text-slate-700">Drop image here or click to upload</p>
            <p className="text-sm text-slate-400 mt-1">JPEG, PNG, WebP up to 10 MB</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
            >
              <Upload size={15} />
              Browse files
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileRef}
        accept="image/*"
        capture="environment"
        onChange={e => handleFile(e.target.files[0])}
        className="hidden"
      />

      {/* How it works */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How AI Scan works</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Camera, label: 'Capture', desc: 'Take or upload a photo', color: 'bg-purple-100 text-purple-600' },
            { icon: Scan,   label: 'Vision',  desc: 'Google Vision detects brand, model, OCR', color: 'bg-blue-100 text-blue-600' },
            { icon: Sparkles, label: 'Claude', desc: 'Maps to QSpiders taxonomy', color: 'bg-orange-100 text-orange-600' },
            { icon: CheckCircle, label: 'Confirm', desc: 'Review 3 fields & save', color: 'bg-green-100 text-green-600' },
          ].map(step => (
            <div key={step.label} className="text-center">
              <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center mx-auto mb-1.5`}>
                <step.icon size={15} />
              </div>
              <p className="text-xs font-semibold text-slate-700">{step.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => selectedFile && onCapture(selectedFile)}
        disabled={!selectedFile}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white rounded-xl font-semibold text-base transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
      >
        <Sparkles size={18} />
        Identify Asset with AI
        <ArrowRight size={18} />
      </button>
    </div>
  )
}

// ─── Step 2: Scanning animation ───────────────────────────────────────────────
function ScanningStep({ imagePreview }) {
  return (
    <div className="max-w-md mx-auto text-center py-12 space-y-6">
      <div className="relative inline-block">
        <img
          src={imagePreview}
          alt="Scanning"
          className="w-56 h-56 object-cover rounded-2xl shadow-lg mx-auto"
        />
        {/* Scan line animation */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="scan-line" />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-purple-400/60" />
      </div>

      <div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
        <p className="font-semibold text-slate-800 text-lg">Analysing asset…</p>
        <div className="text-sm text-slate-400 mt-1 space-y-0.5">
          <p>Layer 1: Google Vision — detecting labels, logos, text</p>
          <p>Layer 2: Claude Sonnet — mapping to asset taxonomy</p>
        </div>
      </div>

      <style>{`
        .scan-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(to right, transparent, #a855f7, transparent);
          animation: scanDown 1.8s ease-in-out infinite;
          box-shadow: 0 0 8px #a855f7;
        }
        @keyframes scanDown {
          0%   { top: 0%; opacity: 1; }
          95%  { top: 100%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Step 3: AI Result + Confirmation form ────────────────────────────────────
function ResultStep({ result, imagePreview, onReset, onSave, saving }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    asset_name:       result.asset_name || '',
    category:         result.category || '',
    sub_category:     result.sub_category || '',
    make_brand:       result.make_brand || '',
    model_no:         result.model_no || '',
    serial_no:        result.serial_no || '',
    condition:        result.condition_estimate || 'Good',
    // Human-confirmed fields
    center_id:        user?.center_id || '',
    location:         '',
    custodian:        user?.name || '',
    purchase_date:    '',
    purchase_value:   '',
    vendor:           '',
    warranty_expiry:  '',
    department:       '',
    notes:            result.notes || '',
  })

  const subCategories = CATEGORIES.find(c => c.name === form.category)?.subcategories || []
  const lowConfidence = result.confidence_pct < 80

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSaveCenter = ['super_admin', 'ops_admin'].includes(user?.role)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Result header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <img
            src={imagePreview}
            alt="Scanned asset"
            className="w-24 h-24 object-cover rounded-xl border border-slate-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 rounded-full px-2.5 py-1 text-xs font-semibold">
                <Sparkles size={12} />
                AI Recognition Result
              </div>
              {result._demo && (
                <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Demo mode — add API keys for real AI
                </span>
              )}
              <ConfidenceBadge pct={result.confidence_pct} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{result.asset_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {result.category} › {result.sub_category}
              {result.make_brand && <span className="ml-2 text-slate-400">· {result.make_brand}</span>}
            </p>
            {result.confidence_reason && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Info size={11} />
                {result.confidence_reason}
              </p>
            )}
          </div>
          <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex-shrink-0">
            <RotateCcw size={14} />
            Re-scan
          </button>
        </div>

        {lowConfidence && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Low confidence — manual review required</p>
              <p className="text-xs text-amber-600 mt-0.5">
                AI confidence is below 80%. Please carefully verify all purple fields before saving.
              </p>
            </div>
          </div>
        )}

        {/* Raw vision data (collapsible) */}
        {result.vision_raw && (
          <details className="mt-3">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              Show raw Vision API data
            </summary>
            <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p><strong>Labels:</strong> {result.vision_raw.labels?.join(', ')}</p>
              <p><strong>Logos:</strong> {result.vision_raw.logos?.join(', ')}</p>
              <p><strong>Objects:</strong> {result.vision_raw.objects?.join(', ')}</p>
              {result.vision_raw.ocr_snippet && <p><strong>OCR:</strong> {result.vision_raw.ocr_snippet}</p>}
            </div>
          </details>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-200 border border-purple-300" />
          <span className="text-slate-500">AI auto-filled — verify if needed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
          <span className="text-slate-500">Requires your input</span>
        </div>
      </div>

      {/* Form — AI fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-slate-700 text-sm pb-2 border-b border-slate-100">AI-Recognised Fields</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <AIField label="Asset Name" aiProvided value={form.asset_name}>
              <input
                type="text"
                value={form.asset_name}
                onChange={e => set('asset_name', e.target.value)}
                className={inputCls}
              />
            </AIField>
          </div>

          <AIField label="Category" aiProvided value={form.category}>
            <select
              value={form.category}
              onChange={e => { set('category', e.target.value); set('sub_category', '') }}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </AIField>

          <AIField label="Sub-category" aiProvided value={form.sub_category}>
            <select
              value={form.sub_category}
              onChange={e => set('sub_category', e.target.value)}
              className={inputCls}
              disabled={!form.category}
            >
              <option value="">Select sub-category…</option>
              {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </AIField>

          <AIField label="Make / Brand" aiProvided value={form.make_brand}>
            <input
              type="text"
              value={form.make_brand}
              onChange={e => set('make_brand', e.target.value)}
              placeholder="e.g. HP, Dell, Voltas"
              className={inputCls}
            />
          </AIField>

          <AIField label="Model No." aiProvided value={form.model_no}>
            <input
              type="text"
              value={form.model_no}
              onChange={e => set('model_no', e.target.value)}
              placeholder="Model number"
              className={inputCls}
            />
          </AIField>

          <AIField label="Serial / Tag No. (OCR)" aiProvided value={form.serial_no}>
            <input
              type="text"
              value={form.serial_no}
              onChange={e => set('serial_no', e.target.value)}
              placeholder="Serial number from label"
              className={inputCls}
            />
          </AIField>

          <AIField label="Condition Estimate" aiProvided value={form.condition}>
            <select
              value={form.condition}
              onChange={e => set('condition', e.target.value)}
              className={inputCls}
            >
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </AIField>
        </div>
      </div>

      {/* Human-confirmed fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-slate-700 text-sm pb-2 border-b border-slate-100">
          Your Confirmation Required
          <span className="ml-2 text-xs font-normal text-slate-400">AI cannot know these — only you can</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AIField label="Center" aiProvided={false} value={form.center_id}>
            <select
              value={form.center_id}
              onChange={e => set('center_id', e.target.value)}
              className={inputCls}
              disabled={!canSaveCenter && !!user?.center_id}
            >
              <option value="">Select center…</option>
              {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </AIField>

          <AIField label="Location / Room" aiProvided={false} value={form.location}>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Lab 3, 2nd Floor"
              className={inputCls}
            />
          </AIField>

          <AIField label="Custodian" aiProvided={false} value={form.custodian}>
            <input
              type="text"
              value={form.custodian}
              onChange={e => set('custodian', e.target.value)}
              placeholder="Staff member responsible"
              className={inputCls}
            />
          </AIField>

          <AIField label="Department" aiProvided={false} value="">
            <input
              type="text"
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="e.g. IT, Admin, Facilities"
              className={inputCls}
            />
          </AIField>

          <AIField label="Purchase Date" aiProvided={false} value="">
            <input
              type="date"
              value={form.purchase_date}
              onChange={e => set('purchase_date', e.target.value)}
              className={inputCls}
            />
          </AIField>

          <AIField label="Purchase Value (₹)" aiProvided={false} value="">
            <input
              type="number"
              value={form.purchase_value}
              onChange={e => set('purchase_value', e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </AIField>

          <AIField label="Vendor / Supplier" aiProvided={false} value="">
            <input
              type="text"
              value={form.vendor}
              onChange={e => set('vendor', e.target.value)}
              placeholder="e.g. HP India"
              className={inputCls}
            />
          </AIField>

          <AIField label="Warranty Expiry" aiProvided={false} value="">
            <input
              type="date"
              value={form.warranty_expiry}
              onChange={e => set('warranty_expiry', e.target.value)}
              className={inputCls}
            />
          </AIField>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Additional notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Any additional observations…"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-3 justify-end pb-6">
        <button
          onClick={onReset}
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.asset_name || !form.category || !form.center_id || !form.location || !form.custodian}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white rounded-xl font-semibold transition disabled:opacity-50 shadow-md"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Asset to Register
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const { user } = useAuth()
  const { addAsset } = useData()
  const navigate = useNavigate()

  const [step, setStep] = useState('capture') // capture | scanning | result | saved
  const [imagePreview, setImagePreview] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const handleCapture = useCallback(async (file) => {
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    setStep('scanning')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Scan failed')

      setAiResult(data)
      setStep('result')
    } catch (err) {
      toast.error(`Scan failed: ${err.message}`)
      setStep('capture')
    }
  }, [])

  const handleSave = useCallback(async (form) => {
    if (!form.asset_name || !form.category || !form.center_id || !form.location || !form.custodian) {
      toast.error('Please fill in all required fields (Name, Category, Center, Location, Custodian)')
      return
    }
    setSaving(true)
    try {
      const newId = await addAsset({
        ...form,
        status: 'Active',
        quantity: form.quantity || 1,
      }, user)
      setSavedId(newId)
      setStep('saved')
      toast.success(`Asset registered! ID: ${newId}`)
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [addAsset, user])

  const handleReset = () => {
    setStep('capture')
    setImagePreview(null)
    setAiResult(null)
    setSavedId(null)
  }

  // ── Saved confirmation ──────────────────────────────────────────────────────
  if (step === 'saved') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Saved!</h2>
          <p className="text-slate-500 mt-2">Successfully registered in the database.</p>
          <p className="font-mono text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg inline-block mt-2">{savedId}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <Scan size={15} />
            Scan Another
          </button>
          <button
            onClick={() => navigate(`/assets/${savedId}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition"
          >
            <Eye size={15} />
            View Asset
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {step === 'capture' && <CaptureStep onCapture={handleCapture} />}
      {step === 'scanning' && <ScanningStep imagePreview={imagePreview} />}
      {step === 'result' && aiResult && (
        <ResultStep
          result={aiResult}
          imagePreview={imagePreview}
          onReset={handleReset}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}
