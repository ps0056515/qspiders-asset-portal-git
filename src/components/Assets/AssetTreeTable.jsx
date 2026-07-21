import { useEffect, useMemo, useState } from 'react'
import {
  ChevronRight, ChevronDown, Building2, Landmark, MapPin, Package
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

function Pill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-violet-100 text-violet-700 ${className}`}>
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

/**
 * Unified City → Center → Location → Asset tree-table (single view).
 */
export default function AssetTreeTable({
  assets,
  selectedAssetId,
  onSelectAsset,
  expandSignal = 0,
}) {
  const tree = useMemo(() => buildLocationTree(assets || []), [assets])
  const [expanded, setExpanded] = useState({})

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

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
        <MapPin size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">No assets to show</p>
        <p className="text-slate-300 text-xs mt-1">Try adjusting your filters or search</p>
      </div>
    )
  }

  const colCount = 6

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
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-violet-50 border-b border-violet-100">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider min-w-[280px]">
                Location / Asset
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">
                Category
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">
                Condition
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">
                ID
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider whitespace-nowrap">
                Custodian
              </th>
            </tr>
          </thead>
          <tbody>
            {tree.map(city => {
              const cityKey = `city:${city.name}`
              const cityOpen = isOpen(cityKey)
              return (
                <CityFragment
                  key={cityKey}
                  city={city}
                  cityKey={cityKey}
                  cityOpen={cityOpen}
                  toggle={toggle}
                  isOpen={isOpen}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={onSelectAsset}
                  colCount={colCount}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CityFragment({ city, cityKey, cityOpen, toggle, isOpen, selectedAssetId, onSelectAsset }) {
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-violet-50/40 cursor-pointer"
        onClick={() => toggle(cityKey)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <TreeToggle open={cityOpen} />
            <Building2 size={15} className="text-violet-600 shrink-0" />
            <span className="font-semibold text-slate-800">{city.name}</span>
            <Pill>C {city.centerCount}</Pill>
            <Pill>A {city.count}</Pill>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-2"><StatusPill status={city.statusSummary} /></td>
        <td />
        <td />
      </tr>
      {cityOpen && city.centers.map(center => {
        const centerKey = `center:${center.id}`
        const centerOpen = isOpen(centerKey)
        return (
          <CenterFragment
            key={centerKey}
            center={center}
            centerKey={centerKey}
            centerOpen={centerOpen}
            toggle={toggle}
            isOpen={isOpen}
            selectedAssetId={selectedAssetId}
            onSelectAsset={onSelectAsset}
          />
        )
      })}
    </>
  )
}

function CenterFragment({ center, centerKey, centerOpen, toggle, isOpen, selectedAssetId, onSelectAsset }) {
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-violet-50/30 cursor-pointer"
        onClick={() => toggle(centerKey)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2 pl-5">
            <TreeToggle open={centerOpen} />
            <Landmark size={14} className="text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700">{center.name}</span>
            <span className="text-[11px] text-slate-400 font-mono">{center.id}</span>
            <Pill>L {center.locationCount}</Pill>
            <Pill>A {center.count}</Pill>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-2"><StatusPill status={center.statusSummary} /></td>
        <td />
        <td />
      </tr>
      {centerOpen && center.locations.map(loc => {
        const locKey = `loc:${center.id}::${loc.name}`
        const locOpen = isOpen(locKey)
        return (
          <LocationFragment
            key={locKey}
            loc={loc}
            locKey={locKey}
            locOpen={locOpen}
            toggle={toggle}
            selectedAssetId={selectedAssetId}
            onSelectAsset={onSelectAsset}
          />
        )
      })}
    </>
  )
}

function LocationFragment({ loc, locKey, locOpen, toggle, selectedAssetId, onSelectAsset }) {
  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
        onClick={() => toggle(locKey)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2 pl-10">
            <TreeToggle open={locOpen} />
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-600 truncate">{loc.name}</span>
            <Pill>A {loc.count}</Pill>
          </div>
        </td>
        <td />
        <td />
        <td className="px-3 py-2"><StatusPill status={loc.statusSummary} /></td>
        <td />
        <td />
      </tr>
      {locOpen && loc.assets.map(asset => {
        const selected = selectedAssetId === asset.id
        return (
          <tr
            key={asset.id}
            onClick={() => onSelectAsset(asset)}
            className={`border-b border-slate-50 cursor-pointer transition-colors ${
              selected ? 'bg-violet-100/70' : 'hover:bg-violet-50/50'
            }`}
          >
            <td className="px-3 py-2">
              <div className="flex items-center gap-2 pl-16">
                <Package size={13} className="text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{asset.asset_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {[asset.make_brand, asset.model_no].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">
              {asset.category?.split('&')[0]?.trim()}
            </td>
            <td className="px-3 py-2">
              <span className={`text-xs font-medium ${COND_COLORS[asset.condition] || 'text-slate-600'}`}>
                {asset.condition}
              </span>
            </td>
            <td className="px-3 py-2">
              <StatusPill status={asset.status} />
            </td>
            <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">
              {asset.id}
            </td>
            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
              {asset.custodian}
            </td>
          </tr>
        )
      })}
    </>
  )
}
