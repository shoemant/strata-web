"use client"

import { createContext, useContext, useState, useMemo } from "react"

const HeaderActionsContext = createContext(null)

export function HeaderActionsProvider({ children }) {
  const [rightSlot, setRightSlot] = useState(null)
  const [leftSlot, setLeftSlot] = useState(null)
  const [title, setTitle] = useState(null)

  const value = useMemo(
    () => ({ rightSlot, setRightSlot, leftSlot, setLeftSlot, title, setTitle }),
    [rightSlot, leftSlot, title]
  )
  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  )
}

export function useHeaderActions() {
  const ctx = useContext(HeaderActionsContext)
  if (!ctx) throw new Error("useHeaderActions must be used within HeaderActionsProvider")
  return ctx
}
