import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToolbarActions } from '../../contexts/ToolbarActionsContext'
import {
  Download, Plus, Search, Expand, Filter, QrCode, MoreVertical, Tag
} from 'lucide-react'

/** Paths that belong under the Assets module (expanded pill bar) */
export function isAssetsModulePath(pathname) {
  return (
    pathname.startsWith('/assets') ||
    pathname.startsWith('/transfers') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/approvals') ||
    pathname.startsWith('/scan')
  )
}

/**
 * White pill secondary bar — Assets expands into related tabs + page actions only.
 * No duplicate Transfers/Maintenance nav icons (those are tabs).
 */
export default function SectionPillBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { run } = useToolbarActions()

  const canAdd = user?.role !== 'auditor'
  const canApprovals = ['super_admin', 'ops_admin', 'center_head'].includes(user?.role)
  const canScan = ['super_admin', 'ops_admin', 'center_head', 'center_staff'].includes(user?.role)

  const p = location.pathname
  const inAssetsModule = isAssetsModulePath(p)

  const section = useMemo(() => {
    if (!inAssetsModule) return null

    const onRegister = p === '/assets' || p.startsWith('/assets/')
    const onTransfers = p.startsWith('/transfers')
    const onMaintenance = p.startsWith('/maintenance')
    const onApprovals = p.startsWith('/approvals')
    const onScan = p.startsWith('/scan')

    // Page-specific action icons only (no module-nav duplicates)
    let icons = [
      { id: 'search', title: 'Search', icon: Search, onClick: () => run('focusSearch') },
      { id: 'filter', title: 'Filters', icon: Filter, onClick: () => run('focusFilters') },
      { id: 'tags', title: 'Filters', icon: Tag, onClick: () => run('focusFilters') },
    ]

    if (onRegister) {
      icons = [
        { id: 'search', title: 'Search', icon: Search, onClick: () => run('focusSearch') },
        { id: 'filter', title: 'Filters', icon: Filter, onClick: () => run('focusFilters') },
        { id: 'export', title: 'Export CSV', icon: Download, onClick: () => run('export') },
        { id: 'add', title: 'Add asset', icon: Plus, onClick: () => run('add'), hidden: !canAdd, accent: true },
        { id: 'qr', title: 'QR for selected', icon: QrCode, onClick: () => run('qr') },
        { id: 'expand', title: 'Expand all', icon: Expand, onClick: () => run('expandAll') },
      ]
    } else if (onTransfers) {
      icons = [
        { id: 'search', title: 'Search', icon: Search, onClick: () => run('focusSearch') },
        { id: 'filter', title: 'Filters', icon: Filter, onClick: () => run('focusFilters') },
        { id: 'add', title: 'New transfer', icon: Plus, onClick: () => run('add'), hidden: !canAdd, accent: true },
      ]
    } else if (onMaintenance) {
      icons = [
        { id: 'search', title: 'Search', icon: Search, onClick: () => run('focusSearch') },
        { id: 'filter', title: 'Filters', icon: Filter, onClick: () => run('focusFilters') },
        { id: 'add', title: 'Log maintenance', icon: Plus, onClick: () => run('add'), hidden: !canAdd, accent: true },
      ]
    } else if (onApprovals) {
      icons = [
        { id: 'search', title: 'Search', icon: Search, onClick: () => run('focusSearch') },
        { id: 'filter', title: 'Filters', icon: Filter, onClick: () => run('focusFilters') },
      ]
    }

    return {
      pill: 'Assets',
      tabs: [
        { id: 'register', label: 'Register', active: onRegister, onClick: () => navigate('/assets') },
        { id: 'transfers', label: 'Transfers', active: onTransfers, onClick: () => navigate('/transfers') },
        { id: 'maintenance', label: 'Maintenance', active: onMaintenance, onClick: () => navigate('/maintenance') },
        { id: 'approvals', label: 'Approvals', active: onApprovals, onClick: () => navigate('/approvals'), hidden: !canApprovals },
        { id: 'scan', label: 'AI Scan', active: onScan, onClick: () => navigate('/scan'), hidden: !canScan },
      ],
      icons,
    }
  }, [inAssetsModule, p, navigate, run, canAdd, canApprovals, canScan])

  if (!section) return null

  const tabs = section.tabs.filter(t => !t.hidden)
  const icons = section.icons.filter(i => !i.hidden)

  return (
    <div className="bg-[var(--color-nav)] px-4 lg:px-6 pb-3 -mt-px">
      <div className="flex items-center bg-white text-slate-800 rounded-full border border-slate-200 shadow-sm px-1.5 py-1 gap-1 min-h-[42px] overflow-x-auto scrollbar-thin">
        <span className="shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full bg-violet-700 text-white text-sm font-semibold whitespace-nowrap">
          {section.pill}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                tab.active
                  ? 'text-violet-800 border-b-2 border-violet-700'
                  : 'text-slate-400 hover:text-slate-700 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          {icons.map(({ id, title, icon: Icon, onClick, accent }) => (
            <button
              key={id}
              type="button"
              title={title}
              onClick={onClick}
              className={`relative shrink-0 p-2 rounded-full transition ${
                accent
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'text-violet-700 hover:bg-violet-50'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        <button
          type="button"
          title="More"
          className="shrink-0 p-2 rounded-full text-violet-700 hover:bg-violet-50"
          onClick={() => run('more') || navigate('/dashboard')}
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  )
}

export { useRegisterToolbarActions } from '../../contexts/ToolbarActionsContext'
