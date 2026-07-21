import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useCenterFilter } from '../contexts/CenterFilterContext'
import {
  Search, X, Package
} from 'lucide-react'
import { CATEGORIES, CONDITIONS, STATUSES } from '../lib/mockData'
import AssetTreeTable from '../components/Assets/AssetTreeTable'
import AssetInspector from '../components/Assets/AssetInspector'
import { useRegisterToolbarActions } from '../components/Layout/SectionPillBar'

export default function AssetRegisterPage() {
  const { user } = useAuth()
  const { assets } = useData()
  const { selectedCenterId } = useCenterFilter()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', status: '', condition: '' })
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [panelMode, setPanelMode] = useState(null) // null | view | qr | edit | add | decommission
  const [expandSignal, setExpandSignal] = useState(0)

  const searchRef = useRef(null)
  const filtersRef = useRef(null)

  const canAdd = user?.role !== 'auditor'
  const canEdit = user?.role !== 'auditor'
  const canDelete = ['super_admin', 'ops_admin', 'center_head'].includes(user?.role)

  // Deep links: ?id=… / ?mode=add / ?mode=edit&id=…
  useEffect(() => {
    const mode = searchParams.get('mode')
    const id = searchParams.get('id')
    if (mode === 'add') {
      setSelectedAssetId(null)
      setPanelMode('add')
      return
    }
    if (id && assets.some(a => a.id === id)) {
      setSelectedAssetId(id)
      setPanelMode(mode === 'edit' ? 'edit' : 'view')
    }
  }, [searchParams, assets])

  const visibleAssets = useMemo(() => {
    let list = assets

    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(a => a.center_id === user.center_id)
    } else if (selectedCenterId) {
      list = list.filter(a => a.center_id === selectedCenterId)
    }

    if (filters.category) list = list.filter(a => a.category === filters.category)
    if (filters.status) list = list.filter(a => a.status === filters.status)
    if (filters.condition) list = list.filter(a => a.condition === filters.condition)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.asset_name?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q) ||
        a.serial_no?.toLowerCase().includes(q) ||
        a.custodian?.toLowerCase().includes(q) ||
        a.make_brand?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.center_name?.toLowerCase().includes(q)
      )
    }

    return list
  }, [assets, user, selectedCenterId, filters, search])

  const selectedAsset = useMemo(
    () => assets.find(a => a.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  )

  const openAdd = useCallback(() => {
    setSelectedAssetId(null)
    setPanelMode('add')
    setSearchParams({ mode: 'add' }, { replace: true })
  }, [setSearchParams])

  const exportCSV = useCallback(() => {
    const rows = [
      ['Asset ID', 'Name', 'Category', 'Sub-category', 'Brand', 'Model', 'Serial No', 'Center', 'Location', 'Qty', 'Condition', 'Status', 'Purchase Date', 'Value (₹)', 'Custodian', 'Last Verified'],
      ...visibleAssets.map(a => [
        a.id, a.asset_name, a.category, a.sub_category, a.make_brand, a.model_no, a.serial_no,
        a.center_name, a.location, a.quantity, a.condition, a.status,
        a.purchase_date, a.purchase_value, a.custodian, a.last_verified
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qspiders-assets.csv'
    a.click()
  }, [visibleAssets])

  useRegisterToolbarActions({
    focusSearch: () => searchRef.current?.focus(),
    focusFilters: () => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    export: exportCSV,
    add: openAdd,
    qr: () => {
      if (selectedAssetId) setPanelMode('qr')
      else searchRef.current?.focus()
    },
    expandAll: () => setExpandSignal(n => n + 1),
  })

  const openInspector = useCallback((asset, mode = 'view') => {
    setSelectedAssetId(asset.id)
    setPanelMode(mode)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('id', asset.id)
      if (mode === 'edit') next.set('mode', 'edit')
      else next.delete('mode')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const closeInspector = () => {
    setPanelMode(null)
    setSelectedAssetId(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('id')
      next.delete('mode')
      return next
    }, { replace: true })
  }

  const showPanel = panelMode !== null

  const clearFilter = (key) => setFilters(f => ({ ...f, [key]: '' }))

  return (
    <div className="space-y-3">
      {/* Filters + search (page actions live in the pill bar) */}
      <div ref={filtersRef} className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Name, ID, serial, location…"
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
        <div className="min-w-36">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Category</label>
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="min-w-36">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Status</label>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="min-w-36">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Condition</label>
          <select
            value={filters.condition}
            onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}
            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(filters.category || filters.status || filters.condition) && (
          <button
            type="button"
            onClick={() => setFilters({ category: '', status: '', condition: '' })}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1.5"
          >
            Clear filters
          </button>
        )}
        <p className="ml-auto text-sm text-slate-500 self-center">
          <strong className="text-slate-700">{visibleAssets.length}</strong> assets
        </p>
      </div>

      {/* Active filter chips */}
      {(filters.category || filters.status || filters.condition) && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <button type="button" onClick={() => clearFilter('category')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
              {filters.category} <X size={12} />
            </button>
          )}
          {filters.status && (
            <button type="button" onClick={() => clearFilter('status')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
              {filters.status} <X size={12} />
            </button>
          )}
          {filters.condition && (
            <button type="button" onClick={() => clearFilter('condition')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
              {filters.condition} <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Tree-table + inspector */}
      <div className={`flex flex-col lg:flex-row gap-4 items-start ${showPanel ? '' : ''}`}>
        <div className={`min-w-0 ${showPanel ? 'flex-1 w-full' : 'w-full'}`}>
          {visibleAssets.length === 0 && !search && !filters.category && !filters.status && !filters.condition ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
              <Package size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">No assets yet</p>
              {canAdd && (
                <button type="button" onClick={openAdd} className="mt-3 text-sm text-violet-600 font-medium hover:underline">
                  + Register your first asset
                </button>
              )}
            </div>
          ) : (
            <AssetTreeTable
              assets={visibleAssets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={(asset, mode = 'view') => openInspector(asset, mode)}
              onEditAsset={(asset) => openInspector(asset, 'edit')}
              onQrAsset={(asset) => openInspector(asset, 'qr')}
              onDecommissionAsset={(asset) => openInspector(asset, 'decommission')}
              canEdit={canEdit}
              canDelete={canDelete}
              expandSignal={expandSignal}
            />
          )}
        </div>

        {showPanel && (
          <AssetInspector
            mode={panelMode}
            asset={selectedAsset}
            onClose={closeInspector}
            onModeChange={(m) => setPanelMode(m)}
          />
        )}
      </div>
    </div>
  )
}
