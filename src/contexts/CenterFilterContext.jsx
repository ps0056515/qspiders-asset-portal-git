import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CenterFilterContext = createContext(null)

export function CenterFilterProvider({ children }) {
  const { user } = useAuth()
  const locked = user?.role === 'center_head' || user?.role === 'center_staff'
  const [selectedCenterId, setSelectedCenterId] = useState(() =>
    locked ? (user?.center_id || '') : ''
  )

  useEffect(() => {
    if (locked) {
      setSelectedCenterId(user?.center_id || '')
    }
  }, [locked, user?.center_id])

  return (
    <CenterFilterContext.Provider
      value={{
        selectedCenterId,
        setSelectedCenterId: locked ? () => {} : setSelectedCenterId,
        locked,
      }}
    >
      {children}
    </CenterFilterContext.Provider>
  )
}

export function useCenterFilter() {
  const ctx = useContext(CenterFilterContext)
  if (!ctx) throw new Error('useCenterFilter must be used within CenterFilterProvider')
  return ctx
}
