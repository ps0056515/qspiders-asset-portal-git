import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CENTERS, CATEGORIES } from '../lib/mockData'

const DataContext = createContext(null)

const API = '/api'

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

export function DataProvider({ children }) {
  const [assets, setAssets] = useState([])
  const [transfers, setTransfers] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [a, t, m, l] = await Promise.all([
        apiFetch('/assets'),
        apiFetch('/transfers'),
        apiFetch('/maintenance'),
        apiFetch('/logs'),
      ])
      setAssets(a)
      setTransfers(t)
      setMaintenance(m)
      setAuditLogs(l)
    } catch (err) {
      console.error('[DataContext] Failed to load data:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const addAsset = useCallback(async (asset, user) => {
    const newAsset = await apiFetch('/assets', {
      method: 'POST',
      body: { ...asset, created_by: user?.name },
    })
    setAssets(prev => [newAsset, ...prev])
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Asset Added', asset_id: newAsset.id,
      asset_name: newAsset.asset_name, center: newAsset.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: 'New asset registered',
    }, ...prev])
    return newAsset.id
  }, [])

  const updateAsset = useCallback(async (id, updates, user) => {
    const updated = await apiFetch(`/assets/${id}`, {
      method: 'PUT',
      body: { ...updates, updated_by: user?.name },
    })
    setAssets(prev => prev.map(a => a.id === id ? updated : a))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Asset Edited', asset_id: id,
      asset_name: updated.asset_name, center: updated.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: 'Asset details updated',
    }, ...prev])
  }, [])

  const requestDecommission = useCallback(async (id, reason, user) => {
    const updated = await apiFetch(`/assets/${id}/decommission`, {
      method: 'PATCH',
      body: { reason, requested_by: user?.name },
    })
    setAssets(prev => prev.map(a => a.id === id ? updated : a))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Decommission Requested', asset_id: id,
      asset_name: updated.asset_name, center: updated.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: `Reason: ${reason}`,
    }, ...prev])
  }, [])

  const approveDecommission = useCallback(async (id, approve, rejectReason, user) => {
    const updated = await apiFetch(`/assets/${id}/approve-decommission`, {
      method: 'PATCH',
      body: { approve, reject_reason: rejectReason, approved_by: user?.name },
    })
    setAssets(prev => prev.map(a => a.id === id ? updated : a))
    setAuditLogs(prev => [{
      id: Date.now(),
      action: approve ? 'Asset Decommissioned' : 'Decommission Rejected',
      asset_id: id, asset_name: updated.asset_name, center: updated.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: approve ? 'Decommission approved' : `Rejected: ${rejectReason}`,
    }, ...prev])
  }, [])

  const initiateTransfer = useCallback(async (transferData, user) => {
    const newTransfer = await apiFetch('/transfers', {
      method: 'POST',
      body: { ...transferData, initiated_by: user?.name },
    })
    setTransfers(prev => [newTransfer, ...prev])
    setAssets(prev => prev.map(a =>
      a.id === transferData.asset_id ? { ...a, status: 'Pending Transfer' } : a
    ))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Transfer Initiated', asset_id: transferData.asset_id,
      asset_name: transferData.asset_name, center: transferData.from_center,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: `To: ${transferData.to_center}`,
    }, ...prev])
    return newTransfer.id
  }, [])

  const approveTransfer = useCallback(async (id, user) => {
    const updated = await apiFetch(`/transfers/${id}/approve`, {
      method: 'PATCH',
      body: { approved_by: user?.name },
    })
    setTransfers(prev => prev.map(t => t.id === id ? updated : t))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Transfer Approved', asset_id: updated.asset_id,
      asset_name: updated.asset_name, center: updated.from_center,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: `Approved transfer to ${updated.to_center}`,
    }, ...prev])
  }, [])

  const completeTransfer = useCallback(async (id, user) => {
    const updated = await apiFetch(`/transfers/${id}/complete`, {
      method: 'PATCH',
      body: { confirmed_by: user?.name },
    })
    setTransfers(prev => prev.map(t => t.id === id ? updated : t))
    const center = CENTERS.find(c => c.id === updated.to_center)
    setAssets(prev => prev.map(a =>
      a.id === updated.asset_id
        ? { ...a, center_id: updated.to_center, center_name: center?.name || updated.to_center, status: 'Active', location: updated.new_location || a.location, custodian: updated.new_custodian || a.custodian }
        : a
    ))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Transfer Completed', asset_id: updated.asset_id,
      asset_name: updated.asset_name, center: updated.to_center,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: `Received at ${updated.to_center}`,
    }, ...prev])
  }, [])

  const startMaintenance = useCallback(async (data, user) => {
    const newMaint = await apiFetch('/maintenance', {
      method: 'POST',
      body: { ...data, logged_by: user?.name },
    })
    setMaintenance(prev => [newMaint, ...prev])
    setAssets(prev => prev.map(a =>
      a.id === data.asset_id ? { ...a, status: 'Under Maintenance' } : a
    ))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Maintenance Started', asset_id: data.asset_id,
      asset_name: data.asset_name, center: data.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: data.issue,
    }, ...prev])
    return newMaint.id
  }, [])

  const completeMaintenance = useCallback(async (id, actualCost, newCondition, user) => {
    const updated = await apiFetch(`/maintenance/${id}/complete`, {
      method: 'PATCH',
      body: { actual_cost: actualCost, new_condition: newCondition, completed_by: user?.name },
    })
    setMaintenance(prev => prev.map(m => m.id === id ? updated : m))
    setAssets(prev => prev.map(a =>
      a.id === updated.asset_id ? { ...a, status: 'Active', condition: newCondition || a.condition } : a
    ))
    setAuditLogs(prev => [{
      id: Date.now(), action: 'Maintenance Completed', asset_id: updated.asset_id,
      asset_name: updated.asset_name, center: updated.center_id,
      actor: user?.name, timestamp: new Date().toISOString(),
      details: `Returned from maintenance. Cost: ₹${actualCost}`,
    }, ...prev])
  }, [])

  return (
    <DataContext.Provider value={{
      assets, transfers, maintenance, auditLogs,
      loading, error, reload: loadAll,
      addAsset, updateAsset, requestDecommission, approveDecommission,
      initiateTransfer, approveTransfer, completeTransfer,
      startMaintenance, completeMaintenance,
      centers: CENTERS, categories: CATEGORIES,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
