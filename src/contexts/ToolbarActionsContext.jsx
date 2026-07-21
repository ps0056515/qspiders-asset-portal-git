import { createContext, useContext, useMemo, useRef, useCallback, useEffect } from 'react'

const ToolbarActionsContext = createContext(null)

export function ToolbarActionsProvider({ children }) {
  const actionsRef = useRef({})

  const setActions = useCallback((next) => {
    actionsRef.current = { ...actionsRef.current, ...next }
  }, [])

  const clearActions = useCallback(() => {
    actionsRef.current = {}
  }, [])

  const run = useCallback((name) => {
    const fn = actionsRef.current[name]
    if (typeof fn === 'function') fn()
  }, [])

  const value = useMemo(
    () => ({ setActions, clearActions, run, actionsRef }),
    [setActions, clearActions, run]
  )

  return (
    <ToolbarActionsContext.Provider value={value}>
      {children}
    </ToolbarActionsContext.Provider>
  )
}

export function useToolbarActions() {
  const ctx = useContext(ToolbarActionsContext)
  if (!ctx) throw new Error('useToolbarActions must be used within ToolbarActionsProvider')
  return ctx
}

/** Pages call this to expose handlers to the pill-bar icons */
export function useRegisterToolbarActions(handlers) {
  const { setActions, clearActions } = useToolbarActions()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const wrap = (key) => () => handlersRef.current[key]?.()
    setActions({
      focusSearch: wrap('focusSearch'),
      focusFilters: wrap('focusFilters'),
      export: wrap('export'),
      add: wrap('add'),
      qr: wrap('qr'),
      expandAll: wrap('expandAll'),
      more: wrap('more'),
    })
    return () => clearActions()
  }, [setActions, clearActions])
}
