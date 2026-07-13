import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, MapPin, Building2, Landmark, Package, Eye
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

function buildLocationTree(assets) {
  // Nested plain objects — avoid JS Map (lucide icon name collision risk)
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
              }
            })
          return {
            id: center.id,
            name: center.name,
            count: locationNodes.reduce((sum, l) => sum + l.count, 0),
            locations: locationNodes,
          }
        })
      return {
        name: cityName,
        count: centerNodes.reduce((sum, c) => sum + c.count, 0),
        centers: centerNodes,
      }
    })
}

function CountBadge({ count }) {
  return (
    <span className="ml-auto text-[11px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full tabular-nums">
      {count}
    </span>
  )
}

function TreeToggle({ open }) {
  return open
    ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
    : <ChevronRight size={14} className="text-slate-400 shrink-0" />
}

export default function LocationTreeView({ assets }) {
  const navigate = useNavigate()
  const tree = useMemo(() => buildLocationTree(assets || []), [assets])

  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (tree.length === 0) return
    setExpanded(prev => {
      if (Object.keys(prev).length > 0) return prev
      return { [`city:${tree[0].name}`]: true }
    })
  }, [tree])

  const isOpen = (key) => Boolean(expanded[key])

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
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

  const collapseAll = () => setExpanded({})

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
        <MapPin size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">No assets to show by location</p>
        <p className="text-slate-300 text-xs mt-1">Try adjusting your filters or search</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin size={15} className="text-orange-500" />
          <span className="font-medium">City → Center → Location</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            Collapse all
          </button>
        </div>
      </div>

      <ul className="py-2 max-h-[70vh] overflow-y-auto scrollbar-thin">
        {tree.map(city => {
          const cityKey = `city:${city.name}`
          const cityOpen = isOpen(cityKey)
          return (
            <li key={cityKey}>
              <button
                type="button"
                onClick={() => toggle(cityKey)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-orange-50/50 transition"
              >
                <TreeToggle open={cityOpen} />
                <Building2 size={15} className="text-orange-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800">{city.name}</span>
                <CountBadge count={city.count} />
              </button>

              {cityOpen && (
                <ul>
                  {city.centers.map(center => {
                    const centerKey = `center:${center.id}`
                    const centerOpen = isOpen(centerKey)
                    return (
                      <li key={centerKey}>
                        <button
                          type="button"
                          onClick={() => toggle(centerKey)}
                          className="w-full flex items-center gap-2 pl-9 pr-4 py-2 text-left hover:bg-orange-50/40 transition"
                        >
                          <TreeToggle open={centerOpen} />
                          <Landmark size={14} className="text-slate-500 shrink-0" />
                          <span className="text-sm font-medium text-slate-700">{center.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{center.id}</span>
                          <CountBadge count={center.count} />
                        </button>

                        {centerOpen && (
                          <ul>
                            {center.locations.map(loc => {
                              const locKey = `loc:${center.id}::${loc.name}`
                              const locOpen = isOpen(locKey)
                              return (
                                <li key={locKey}>
                                  <button
                                    type="button"
                                    onClick={() => toggle(locKey)}
                                    className="w-full flex items-center gap-2 pl-14 pr-4 py-2 text-left hover:bg-slate-50 transition"
                                  >
                                    <TreeToggle open={locOpen} />
                                    <MapPin size={13} className="text-slate-400 shrink-0" />
                                    <span className="text-sm text-slate-600 truncate">{loc.name}</span>
                                    <CountBadge count={loc.count} />
                                  </button>

                                  {locOpen && (
                                    <ul className="pb-1">
                                      {loc.assets.map(asset => (
                                        <li key={asset.id}>
                                          <div className="flex items-center gap-2 pl-[4.5rem] pr-4 py-1.5 hover:bg-orange-50/60 group">
                                            <Package size={13} className="text-slate-300 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm text-slate-800 truncate font-medium">{asset.asset_name}</p>
                                              <p className="text-[11px] text-slate-400 font-mono truncate">{asset.id}</p>
                                            </div>
                                            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                                              {asset.status}
                                            </span>
                                            <button
                                              type="button"
                                              title="View asset"
                                              onClick={() => navigate(`/assets/${asset.id}`)}
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition"
                                            >
                                              <Eye size={13} />
                                            </button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
