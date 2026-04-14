import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_USERS, CENTERS } from '../lib/mockData'
import { Users, Shield, UserCheck, Eye, Building2, Mail } from 'lucide-react'

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  ops_admin: 'Ops Admin',
  center_head: 'Center Head',
  center_staff: 'Center Staff',
  auditor: 'Auditor',
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  ops_admin: 'bg-blue-100 text-blue-700 border-blue-200',
  center_head: 'bg-green-100 text-green-700 border-green-200',
  center_staff: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  auditor: 'bg-gray-100 text-gray-700 border-gray-200',
}

const ROLE_PERMISSIONS = {
  super_admin: ['Full access to all centers', 'All actions', 'User management', 'All reports', 'System configuration'],
  ops_admin: ['All centers — read/write', 'Approve/reject requests', 'Transfer management', 'Maintenance tracking', 'All reports'],
  center_head: ['Own center only', 'Add/edit/delete requests', 'Approve minor requests', 'Center reports', 'Audit sign-off'],
  center_staff: ['Own center only', 'Add assets via portal/app', 'View own center list', 'No deletion without approval'],
  auditor: ['Read-only all centers', 'Audit mode access', 'Export reports', 'No edit/delete permissions'],
}

export default function UsersPage() {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState(null)

  const getCenterName = (id) => {
    if (!id) return 'All Centers'
    return CENTERS.find(c => c.id === id)?.name || id
  }

  const grouped = Object.entries(ROLE_LABELS).map(([role, label]) => ({
    role,
    label,
    users: DEMO_USERS.filter(u => u.role === role),
  })).filter(g => g.users.length > 0)

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800 font-medium">Demo Mode — User Management</p>
        <p className="text-xs text-amber-600 mt-1">
          In production, users are managed via Supabase Auth with role-based access control. This page shows the demo accounts and role permissions.
        </p>
      </div>

      {/* Role permissions overview */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Roles & Permissions Overview</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className={`rounded-xl border p-4 ${ROLE_COLORS[role]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} />
                <p className="font-semibold text-sm">{label}</p>
              </div>
              <ul className="space-y-1">
                {ROLE_PERMISSIONS[role].map((perm, i) => (
                  <li key={i} className="text-xs flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* User list by role */}
      <div className="space-y-4">
        {grouped.map(({ role, label, users }) => (
          <div key={role} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role]}`}>{label}</span>
              <span className="text-slate-400 font-normal text-xs">({users.length} user{users.length > 1 ? 's' : ''})</span>
            </h3>
            <div className="grid gap-2">
              {users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-orange-50 transition cursor-pointer"
                  onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                >
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{u.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Mail size={10} />
                      <span>{u.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Building2 size={12} />
                    <span>{getCenterName(u.center_id)}</span>
                  </div>

                  {selectedUser?.id === u.id && (
                    <div className="absolute mt-16 ml-12 z-10">
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SLA reference */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">SLA Targets</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Event</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Target SLA</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                ['New asset registered after receipt', 'Within 2 hours', 'Center Staff'],
                ['Deletion request approved / rejected', 'Within 48 hours', 'Ops Admin'],
                ['Transfer processed end-to-end', 'Within 5 business days', 'Ops Admin + Both Centers'],
                ['Audit completion per center', 'Within 10 days of quarter start', 'Center Head'],
                ['Warranty expiry alert actioned', 'Within 30 days of alert', 'Ops Admin / Center Head'],
                ['Invoice-to-record matching (>₹10k)', 'Within 30 days', 'Ops Admin'],
                ['Audit exception resolved', 'Within 15 days of sign-off', 'Ops Admin'],
              ].map(([event, sla, owner]) => (
                <tr key={event} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 text-slate-700">{event}</td>
                  <td className="py-2.5 px-3 font-medium text-orange-600">{sla}</td>
                  <td className="py-2.5 px-3 text-slate-500">{owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
