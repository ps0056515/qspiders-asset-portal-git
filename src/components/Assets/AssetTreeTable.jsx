import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ChevronRight, ChevronDown, Building2, Landmark, MapPin, Package,
  Eye, Pencil, QrCode, ArrowLeftRight, Copy, MoreHorizontal, Expand, Trash2
} from 'lucide-react'
import { CENTERS } from '../../lib/mockData'

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

const STICKY = 'sticky left-0 z-[5] bg-inherit'
const STICKY_HEAD = 'sticky left-0 z-[15] bg-violet-50'

export function buildLocationTree(assets) {
  const cities = {}

  for (const asset of assets) {
    const centerMeta = CENTERS.find(c => c.id === asset.center_id)
    const city = centerMeta?.city || 'Other'
    const centerId = asset.center_id || 'unknown'
    const centerName = asset.center_name || centerMeta?.name || centerId
    const location = (asset.location || '').trim() || 'Unassigned'

    if (!cities[city]) cities[city] = {}
    if (!cities[city][centerId]) {
      cities[city][centerId] = { id: centerId, name: centerName, locations: {} }
    }
    const center = cities[city][centerId]
    if (!center.locations[location]) center.locations[location] = []
    center.locations[location].push(asset)
  }

  return Object.keys(cities)
    .sort((a, b) => a.localeCompare(b))
    .map(cityName => {
      const centerNodes = Object.values(cities[cityName])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(center => {
          const locationNodes = Object.keys(center.locations)
            .sort((a, b) => a.localeCompare(b))
            .map(name => {
              const list = center.locations[name]
              return {
                name,
                count: list.length,
                assets: [...list].sort((a, b) => a.asset_name.localeCompare(b.asset_name)),
                statusSummary: summarizeStatuses(list),
              }
            })
          const allAssets = locationNodes.flatMap(l => l.assets)
          return {
            id: center.id,
            name: center.name,
            count: locationNodes.reduce((sum, l) => sum + l.count, 0),
            locationCount: locationNodes.length,
            locations: locationNodes,
            statusSummary: summarizeStatuses(allAssets),
          }
        })
      const allAssets = centerNodes.flatMap(c => c.locations.flatMap(l => l.assets))
      return {
        name: cityName,
        count: centerNodes.reduce((sum, c) => sum + c.count, 0),
        centerCount: centerNodes.length,
        centers: centerNodes,
        statusSummary: summarizeStatuses(allAssets),
      }
    })
}

function summarizeStatuses(assets) {
  if (!assets.length) return null
  const unique = [...new Set(assets.map(a => a.status).filter(Boolean))]
  if (unique.length === 1) return unique[0]
  if (unique.length === 0) return null
  return 'Mixed'
}

function Pill({ children, title }) {
  return (
    <span
      title={title}
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-violet-100 text-violet-700"
    >
      {children}
    </span>
  )
}

function StatusPill({ status }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] || 'bg-sky-100 text-sky-700'}`}>
      {status === 'Mixed' ? 'Mixed' : status}
    </span>
  )
}

function TreeToggle({ open }) {
  return open
    ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
    : <ChevronRight size={14} className="text-slate-400 shrink-0" />
}

function copyId(id, e) {
  e?.stopPropagation()
  navigator.clipboard?.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy')
  )
}

/**
 * Unified City → Center → Location → Asset tree-table with sticky tree column,
 * hover row actions, and copy ID.
 */
export default function AssetTreeTable({
  assets,
  selectedAssetId,
  onSelectAsset,
  onEditAsset,
  onQrAsset,
  onDecommissionAsset,
  canEdit = true,
  canDelete = true,
  expandSignal = 0,
}) {
  const navigate = useNavigate()
  const tree = useMemo(() => buildLocationTree(assets || []), [assets])
  const [expanded, setExpanded] = useState({})
  const [menuAssetId, setMenuAssetId] = useState(null)

  useEffect(() => {
    if (tree.length === 0) return
    setExpanded(prev => {
      if (Object.keys(prev).length > 0) return prev
      const next = {}
      for (const city of tree) {
        next[`city:${city.name}`] = true
        for (const center of city.centers) {
          next[`center:${center.id}`] = true
        }
      }
      return next
    })
  }, [tree])

  const isOpen = (key) => Boolean(expanded[key])
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const expandSubtree = (keys) => {
    setExpanded(prev => {
      const next = { ...prev }
      for (const k of keys) next[k] = true
      return next
    })
  }

  const expandAll = () => {
    const next = {}
    for (const city of tree) {
      next[`city:${city.name}`] = true
      for (const center of city.centers) {
        next[`center:${center.id}`] = true
        for (const loc of center.locations) {
          next[`loc:${center.id}::${loc.name}`] = true
        }
      }
    }
    setExpanded(next)
  }

  useEffect(() => {
    if (expandSignal > 0) expandAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal])

  const collapseAll = () => setExpanded({})

  useEffect(() => {
    const close = () => setMenuAssetId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
        <MapPin size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">No assets to show</p>
        <p className="text-slate-300 text-xs mt-1">Try adjusting your filters or search</p>
      </div>
    )
  }

  const ctx = {
    isOpen, toggle, expandSubtree,
    selectedAssetId, onSelectAsset, onEditAsset, onQrAsset, onDecommissionAsset,
    canEdit, canDelete, navigate, menuAssetId, setMenuAssetId,
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-100 bg-violet-50/90">
        <p className="text-xs font-medium text-violet-800">City → Center → Location → Asset</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={expandAll} className="text-xs px-2.5 py-1 rounded-md text-violet-700 hover:bg-violet-100 transition">
            Expand all
          </button>
          <button type="button" onClick={collapseAll} className="text-xs px-2.5 py-1 rounded-md text-violet-700 hover:bg-violet-100 transition">
            Collapse all
          </button>
        </div>
      </div>

      <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-16rem)]">
        <table className="w-full text-sm border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-violet-50 border-b border-violet-100">
              <th className={`px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider min-w-[300px] ${STICKY_HEAD} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>
                Location / Asset
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">Category</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">Condition</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">Custodian</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">Last verified</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tree.map(city => {
              const cityKey = `city:${city.name}`
              return (
                <CityFragment
                  key={cityKey}
                  city={city}
                  cityKey={cityKey}
                  cityOpen={isOpen(cityKey)}
                  ctx={ctx}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** ID, Custodian, Last verified, Actions — after Status on group rows */
function TrailingEmptyCells() {
  return (
    <>
      <td />
      <td />
      <td />
      <td />
    </>
  )
}

function CityFragment({ city, cityKey, cityOpen, ctx }) {
  const { toggle, expandSubtree, isOpen } = ctx
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-violet-50/40 cursor-pointer group bg-white"
        onClick={() => toggle(cityKey)}
      >
        <td className={`px-3 py-1.5 ${STICKY} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`}>
          <div className="flex items-center gap-2">
            <TreeToggle open={cityOpen} />
            <Building2 size={15} className="text-violet-600 shrink-0" />
            <span className="font-semibold text-slate-800 text-[13px]">{city.name}</span>
            <Pill title={`${city.centerCount} centers`}>C {city.centerCount}</Pill>
            <Pill title={`${city.count} assets`}>A {city.count}</Pill>
            <button
              type="button"
              title="Expand all under city"
              onClick={(e) => {
                e.stopPropagation()
                const keys = [cityKey]
                for (const c of city.centers) {
                  keys.push(`center:${c.id}`)
                  for (const loc of c.locations) keys.push(`loc:${c.id}::${loc.name}`)
                }
                expandSubtree(keys)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-violet-600 hover:bg-violet-100 transition"
            >
              <Expand size={13} />
            </button>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-1.5"><StatusPill status={city.statusSummary} /></td>
        <TrailingEmptyCells />
      </tr>
      {cityOpen && city.centers.map(center => {
        const centerKey = `center:${center.id}`
        return (
          <CenterFragment
            key={centerKey}
            center={center}
            centerKey={centerKey}
            centerOpen={isOpen(centerKey)}
            ctx={ctx}
          />
        )
      })}
    </>
  )
}

function CenterFragment({ center, centerKey, centerOpen, ctx }) {
  const { toggle, expandSubtree, isOpen } = ctx
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-violet-50/30 cursor-pointer group bg-white"
        onClick={() => toggle(centerKey)}
      >
        <td className={`px-3 py-1.5 ${STICKY} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`}>
          <div className="flex items-center gap-2 pl-5">
            <TreeToggle open={centerOpen} />
            <Landmark size={14} className="text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700 text-[13px]">{center.name}</span>
            <span className="text-[11px] text-slate-400 font-mono">{center.id}</span>
            <Pill title={`${center.locationCount} locations`}>L {center.locationCount}</Pill>
            <Pill title={`${center.count} assets`}>A {center.count}</Pill>
            <button
              type="button"
              title="Expand all under center"
              onClick={(e) => {
                e.stopPropagation()
                const keys = [centerKey]
                for (const loc of center.locations) keys.push(`loc:${center.id}::${loc.name}`)
                expandSubtree(keys)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-violet-600 hover:bg-violet-100 transition"
            >
              <Expand size={13} />
            </button>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-1.5"><StatusPill status={center.statusSummary} /></td>
        <TrailingEmptyCells />
      </tr>
      {centerOpen && center.locations.map(loc => {
        const locKey = `loc:${center.id}::${loc.name}`
        return (
          <LocationFragment
            key={locKey}
            loc={loc}
            locKey={locKey}
            locOpen={isOpen(locKey)}
            ctx={ctx}
          />
        )
      })}
    </>
  )
}

function LocationFragment({ loc, locKey, locOpen, ctx }) {
  const { toggle } = ctx
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer bg-white"
        onClick={() => toggle(locKey)}
      >
        <td className={`px-3 py-1.5 ${STICKY} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`}>
          <div className="flex items-center gap-2 pl-10">
            <TreeToggle open={locOpen} />
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-600 truncate text-[13px]">{loc.name}</span>
            <Pill title={`${loc.count} assets`}>A {loc.count}</Pill>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-1.5"><StatusPill status={loc.statusSummary} /></td>
        <TrailingEmptyCells />
      </tr>
      {locOpen && loc.assets.map(asset => (
        <AssetRow key={asset.id} asset={asset} ctx={ctx} />
      ))}
    </>
  )
}

function AssetRow({ asset, ctx }) {
  const {
    selectedAssetId, onSelectAsset, onEditAsset, onQrAsset, onDecommissionAsset,
    canEdit, canDelete, navigate, menuAssetId, setMenuAssetId,
  } = ctx
  const selected = selectedAssetId === asset.id
  const menuOpen = menuAssetId === asset.id

  return (
    <tr
      onClick={() => onSelectAsset(asset, 'view')}
      className={`border-b border-slate-50 cursor-pointer transition-colors group ${
        selected ? 'bg-violet-100/70' : 'bg-white hover:bg-violet-50/50'
      }`}
    >
      <td className={`px-3 py-1.5 ${STICKY} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${selected ? 'bg-violet-100/70' : 'bg-inherit group-hover:bg-violet-50/50'}`}>
        <div className="flex items-center gap-2 pl-16 min-w-0">
          <Package size={13} className="text-violet-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate text-[13px] leading-tight">{asset.asset_name}</p>
            <p className="text-[11px] text-slate-400 truncate leading-tight">
              {[asset.make_brand, asset.model_no].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap text-xs">
        {asset.category?.split('&')[0]?.trim()}
      </td>
      <td className="px-3 py-1.5">
        <span className={`text-xs font-medium ${COND_COLORS[asset.condition] || 'text-slate-600'}`}>
          {asset.condition}
        </span>
      </td>
      <td className="px-3 py-1.5">
        <StatusPill status={asset.status} />
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-slate-500">{asset.id}</span>
          <button
            type="button"
            title="Copy ID"
            onClick={(e) => copyId(asset.id, e)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-violet-600 hover:bg-violet-100 transition"
          >
            <Copy size={12} />
          </button>
        </div>
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-600 whitespace-nowrap">
        {asset.custodian}
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-500 whitespace-nowrap">
        {asset.last_verified || '—'}
      </td>
      <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button
            type="button"
            title="View"
            onClick={() => onSelectAsset(asset, 'view')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
          >
            <Eye size={13} />
          </button>
          {canEdit && asset.status !== 'Decommissioned' && (
            <button
              type="button"
              title="Edit"
              onClick={() => onEditAsset?.(asset)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            type="button"
            title="QR code"
            onClick={() => onQrAsset?.(asset)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
          >
            <QrCode size={13} />
          </button>
          {canEdit && asset.status === 'Active' && (
            <button
              type="button"
              title="Transfer"
              onClick={() => navigate(`/transfers?asset=${encodeURIComponent(asset.id)}`)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-700"
            >
              <ArrowLeftRight size={13} />
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              title="More"
              onClick={(e) => {
                e.stopPropagation()
                setMenuAssetId(menuOpen ? null : asset.id)
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-violet-50 flex items-center gap-2"
                  onClick={(e) => { copyId(asset.id, e); setMenuAssetId(null) }}
                >
                  <Copy size={12} /> Copy asset ID
                </button>
                {canDelete && !['Decommissioned', 'Pending Decommission'].includes(asset.status) && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      onDecommissionAsset?.(asset)
                      setMenuAssetId(null)
                    }}
                  >
                    <Trash2 size={12} /> Decommission
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
