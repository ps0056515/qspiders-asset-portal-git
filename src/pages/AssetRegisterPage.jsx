import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import {
  Search, Filter, Plus, Eye, Edit, ArrowLeftRight, QrCode,
  Download, ChevronDown, X, Package, Wrench, Trash2
} from 'lucide-react'
import { CATEGORIES, CENTERS, CONDITIONS, STATUSES } from '../lib/mockData'
import QRModal from '../components/Assets/QRModal'
import DecommissionModal from '../components/Assets/DecommissionModal'

const STATUS_COLORS = {
  'Active': 'bg-green-100 text-green-700',
  'Under Maintenance': 'bg-blue-100 text-blue-700',
  'In Storage': 'bg-gray-100 text-gray-600',
  'Decommissioned': 'bg-red-100 text-red-600',
  'Pending Decommission': 'bg-amber-100 text-amber-700',
  'Pending Transfer': 'bg-purple-100 text-purple-700',
}

const COND_COLORS = {
  'Good': 'text-green-600',
  'Fair': 'text-amber-600',
  'Needs Repair': 'text-red-600',
  'Damaged': 'text-red-700',
}

export default function AssetRegisterPage() {
  const { user } = useAuth()
  const { assets, requestDecommission, startMaintenance } = useData()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ center: '', category: '', status: '', condition: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [qrAsset, setQrAsset] = useState(null)
  const [decommAsset, setDecommAsset] = useState(null)
  const [sortBy, setSortBy] = useState('asset_name')
  const [sortDir, setSortDir] = useState('asc')

  const visibleAssets = useMemo(() => {
    let list = assets

    // Role-based filter
    if (user?.role === 'center_head' || user?.role === 'center_staff') {
      list = list.filter(a => a.center_id === user.center_id)
    }

    // Filters
    if (filters.center) list = list.filter(a => a.center_id === filters.center)
    if (filters.category) list = list.filter(a => a.category === filters.category)
    if (filters.status) list = list.filter(a => a.status === filters.status)
    if (filters.condition) list = list.filter(a => a.condition === filters.condition)

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.asset_name?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q) ||
        a.serial_no?.toLowerCase().includes(q) ||
        a.custodian?.toLowerCase().includes(q) ||
        a.make_brand?.toLowerCase().includes(q)
      )
    }

    // Sort
    list = [...list].sort((a, b) => {
      const va = a[sortBy] || ''
      const vb = b[sortBy] || ''
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })

    return list
  }, [assets, user, filters, search, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const toggleRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelectedRows(prev => prev.length === visibleAssets.length ? [] : visibleAssets.map(a => a.id))
  }

  const canEdit = user?.role !== 'auditor'
  const canDelete = ['super_admin', 'ops_admin', 'center_head', 'center_staff'].includes(user?.role)
  const canAdd = user?.role !== 'auditor'

  const clearFilter = (key) => setFilters(f => ({ ...f, [key]: '' }))
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const exportCSV = () => {
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
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, serial no, custodian…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition ${showFilters || activeFilterCount > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <Download size={15} />
          Export
        </button>

        {canAdd && (
          <button
            onClick={() => navigate('/assets/add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus size={15} />
            Add Asset
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(user?.role === 'super_admin' || user?.role === 'ops_admin' || user?.role === 'auditor') && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Center</label>
              <div className="relative">
                <select
                  value={filters.center}
                  onChange={e => setFilters(f => ({ ...f, center: e.target.value }))}
                  className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Centers</option>
                  {CENTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {filters.center && <button onClick={() => clearFilter('center')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-slate-400" /></button>}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
            <div className="relative">
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Condition</label>
            <select
              value={filters.condition}
              onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}
              className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Conditions</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <strong className="text-slate-700">{visibleAssets.length}</strong> assets
          {selectedRows.length > 0 && <span className="ml-2 text-orange-600">· {selectedRows.length} selected</span>}
        </p>
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="text-xs flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Download size={12} /> Export selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" className="rounded" checked={selectedRows.length === visibleAssets.length && visibleAssets.length > 0} onChange={toggleAll} />
                </th>
                {[
                  { key: 'id', label: 'Asset ID' },
                  { key: 'asset_name', label: 'Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'center_name', label: 'Center' },
                  { key: 'location', label: 'Location' },
                  { key: 'quantity', label: 'Qty' },
                  { key: 'condition', label: 'Condition' },
                  { key: 'status', label: 'Status' },
                  { key: 'custodian', label: 'Custodian' },
                  { key: 'last_verified', label: 'Last Verified' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  >
                    {col.label}
                    {sortBy === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleAssets.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <Package size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-medium">No assets found</p>
                    <p className="text-slate-300 text-xs mt-1">Try adjusting your filters or search</p>
                  </td>
                </tr>
              ) : visibleAssets.map(asset => (
                <tr key={asset.id} className={`hover:bg-orange-50/30 transition-colors ${selectedRows.includes(asset.id) ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" checked={selectedRows.includes(asset.id)} onChange={() => toggleRow(asset.id)} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.id}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800 leading-tight">{asset.asset_name}</div>
                    <div className="text-xs text-slate-400">{asset.make_brand} · {asset.model_no}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{asset.category?.split('&')[0]?.trim()}</td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">{asset.center_name}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap max-w-32 truncate">{asset.location}</td>
                  <td className="px-3 py-3 text-slate-700 font-medium">{asset.quantity}</td>
                  <td className="px-3 py-3">
                    <span className={`font-medium text-xs ${COND_COLORS[asset.condition] || 'text-slate-600'}`}>{asset.condition}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.custodian}</td>
                  <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{asset.last_verified}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        title="View"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition"
                      >
                        <Eye size={14} />
                      </button>
                      {canEdit && asset.status !== 'Decommissioned' && (
                        <button
                          onClick={() => navigate(`/assets/edit/${asset.id}`)}
                          title="Edit"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-500 hover:text-blue-600 transition"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setQrAsset(asset)}
                        title="QR Code"
                        className="p-1.5 hover:bg-purple-50 rounded-lg text-slate-500 hover:text-purple-600 transition"
                      >
                        <QrCode size={14} />
                      </button>
                      {canEdit && asset.status === 'Active' && (
                        <button
                          onClick={() => navigate(`/transfers?asset=${asset.id}`)}
                          title="Transfer"
                          className="p-1.5 hover:bg-green-50 rounded-lg text-slate-500 hover:text-green-600 transition"
                        >
                          <ArrowLeftRight size={14} />
                        </button>
                      )}
                      {canDelete && !['Decommissioned', 'Pending Decommission'].includes(asset.status) && (
                        <button
                          onClick={() => setDecommAsset(asset)}
                          title="Decommission"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {qrAsset && <QRModal asset={qrAsset} onClose={() => setQrAsset(null)} />}
      {decommAsset && <DecommissionModal asset={decommAsset} onClose={() => setDecommAsset(null)} />}
    </div>
  )
}
